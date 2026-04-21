import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

// 초기 단일 법인 데이터
export const initialCompany = {
  id: 'C1',
  name: '엔터프라이즈 (주)'
};

export const initialRates = {
  nationalPension: 4.5,
  healthInsurance: 3.545,
  longTermCareRatio: 12.95,
  employmentInsurance: 0.9,
  workersComp: 0.75
};

const AppContext = createContext();

export function AppProvider({ children }) {
  const [company, setCompany] = useState(initialCompany);
  const [employees, setEmployees] = useState([]);
  const [dailyWorkers, setDailyWorkers] = useState([]);
  const [dailyWorkLogs, setDailyWorkLogs] = useState([]);
  const [insuranceRates, setInsuranceRates] = useState(initialRates);
  const [payrollArchives, setPayrollArchives] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 초기 데이터 로드 및 마이그레이션 로직
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: dbEmps } = await supabase.from('employees').select('*');
        const { data: dbDailyWorkers } = await supabase.from('daily_workers').select('*');
        const { data: dbLogs } = await supabase.from('daily_work_logs').select('*');
        const { data: dbSettings } = await supabase.from('system_settings').select('value').eq('key', 'insurance_rates').single();

        const mappedEmps = (dbEmps || []).map(e => ({
          ...e,
          extra_pays: typeof e.addons === 'string' ? JSON.parse(e.addons) : (e.addons || [])
        }));

        if ((!mappedEmps || mappedEmps.length === 0) && localStorage.getItem('employees_v2')) {
          console.log('마이그레이션 시작...');
          await migrateFromLocalStorage();
          const { data: reEmps } = await supabase.from('employees').select('*');
          const { data: reDaily } = await supabase.from('daily_workers').select('*');
          const { data: reLogs } = await supabase.from('daily_work_logs').select('*');
          
          setEmployees((reEmps || []).map(e => ({
            ...e,
            extra_pays: typeof e.addons === 'string' ? JSON.parse(e.addons) : (e.addons || [])
          })));
          setDailyWorkers(reDaily || []);
          setDailyWorkLogs(reLogs || []);
        } else {
          setEmployees(mappedEmps);
          setDailyWorkers(dbDailyWorkers || []);
          setDailyWorkLogs(dbLogs || []);
          const savedArchives = localStorage.getItem('payrollArchives');
          if (savedArchives) setPayrollArchives(JSON.parse(savedArchives));
          if (dbSettings) setInsuranceRates(dbSettings.value);
        }
      } catch (error) {
        console.error('데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, []);

  const migrateFromLocalStorage = async () => {
    const localEmps = JSON.parse(localStorage.getItem('employees_v2') || '[]');
    const localDailyWorkers = JSON.parse(localStorage.getItem('daily_workers') || '[]');
    const localLogs = JSON.parse(localStorage.getItem('daily_work_logs') || '[]');
    
    if (localEmps.length > 0) {
      await supabase.from('employees').upsert(localEmps.map(e => ({
        id: String(e.id),
        name: e.name,
        join_date: e.join_date,
        resignation_date: e.resignation_date,
        status: e.resignation_date ? '퇴사' : '재직',
        workplace: e.workplace,
        role: e.role,
        position: e.position,
        dependents: e.dependents,
        base_salary: e.base_salary,
        phone: e.phone,
        birth_date: e.birth_date,
        address: e.address,
        employment_type: e.employment_type,
        is_dual_employed: e.is_dual_employed,
        probation_end_date: e.probation_end_date,
        continue_national_pension: e.continue_national_pension,
        bank_name: e.bank_name,
        account_number: e.account_number,
        addons: JSON.stringify(e.extra_pays || [])
      })));
    }

    if (localDailyWorkers.length > 0) {
      await supabase.from('daily_workers').upsert(localDailyWorkers.map(w => ({
        id: String(w.id),
        name: w.name,
        phone: w.phone, daily_rate: w.daily_rate, bank: w.bank, account: w.account
      })));
    }

    if (localLogs.length > 0) {
      await supabase.from('daily_work_logs').upsert(localLogs.map(l => ({
        id: String(l.id), worker_id: String(l.worker_id), work_date: l.work_date, hours: l.hours, wage: l.wage
      })));
    }
  };

  // 2. 직원 관리 CRUD (DB 컬럼에 맞게 엄격하게 필터링)
  const addEmployee = async (empData) => {
    const { extra_pays, ...rest } = empData;
    const newEmpId = `E${Date.now()}`;
    
    // DB 컬럼에 정의된 필드만 추출
    const payload = {
      id: newEmpId,
      name: rest.name,
      join_date: rest.join_date,
      status: '재직',
      workplace: rest.workplace,
      role: rest.role,
      position: rest.position,
      dependents: rest.dependents || 1,
      base_salary: rest.base_salary || 0,
      phone: rest.phone,
      birth_date: rest.birth_date,
      address: rest.address,
      employment_type: rest.employment_type,
      is_dual_employed: rest.is_dual_employed || false,
      probation_end_date: rest.probation_end_date,
      continue_national_pension: rest.continue_national_pension || false,
      bank_name: rest.bank_name,
      account_number: rest.account_number,
      addons: JSON.stringify(extra_pays || [])
    };
    
    const { error } = await supabase.from('employees').insert([payload]);
    if (error) {
      console.error('DB 저장 실패:', error.message);
      alert('저장 실패: ' + error.message);
      return;
    }
    
    // 로컬 상태 업데이트 (화면 반영)
    setEmployees([...employees, { ...payload, extra_pays: extra_pays || [] }]);
    console.log('직원 등록 성공:', payload.name);
  };

  const updateEmployee = async (id, updatedData) => {
    const { extra_pays, ...rest } = updatedData;
    const payload = { ...rest };
    if (extra_pays) payload.addons = JSON.stringify(extra_pays);

    const { error } = await supabase.from('employees').update(payload).eq('id', id);
    if (!error) {
      setEmployees(employees.map(emp => emp.id === id ? { ...emp, ...updatedData } : emp));
    } else {
      console.error('DB 수정 실패:', error.message);
    }
  };

  const resignEmployee = async (id, resignationDate) => {
    await updateEmployee(id, { resignation_date: resignationDate, status: '퇴사' });
  };

  const cancelResignation = async (id) => {
    await updateEmployee(id, { resignation_date: null, status: '재직' });
  };

  // 3. 일용직 관리 CRUD
  const addDailyWorker = async (worker) => {
    const { error } = await supabase.from('daily_workers').insert([worker]);
    if (!error) setDailyWorkers([...dailyWorkers, worker]);
  };

  const removeDailyWorker = async (id) => {
    const { error } = await supabase.from('daily_workers').delete().eq('id', id);
    if (!error) setDailyWorkers(dailyWorkers.filter(w => w.id !== id));
  };

  const addWorkLog = async (log) => {
    const { error } = await supabase.from('daily_work_logs').insert([log]);
    if (!error) setDailyWorkLogs([...dailyWorkLogs, log]);
  };

  const removeWorkLog = async (id) => {
    const { error } = await supabase.from('daily_work_logs').delete().eq('id', id);
    if (!error) setDailyWorkLogs(dailyWorkLogs.filter(l => l.id !== id));
  };

  const updateWorkLog = async (id, updatedData) => {
    const { error } = await supabase.from('daily_work_logs').update(updatedData).eq('id', id);
    if (!error) {
      setDailyWorkLogs(dailyWorkLogs.map(l => l.id === id ? { ...l, ...updatedData } : l));
    }
  };

  // 4. 설정 관리
  const updateRates = async (newRates) => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'insurance_rates', value: newRates });
    if (!error) setInsuranceRates(newRates);
  };

  const saveArchive = (year, month, snapshotData) => {
    setPayrollArchives(prev => {
      const filtered = prev.filter(p => !(p.year === year && p.month === month));
      const newArchives = [...filtered, { year, month, data: snapshotData, finalizedAt: new Date().toISOString() }];
      localStorage.setItem('payrollArchives', JSON.stringify(newArchives));
      return newArchives;
    });
  };

  return (
    <AppContext.Provider value={{
      company, employees, dailyWorkers, dailyWorkLogs, insuranceRates, payrollArchives, loading,
      setInsuranceRates: updateRates, addEmployee, updateEmployee, resignEmployee, cancelResignation,
      addDailyWorker, removeDailyWorker, addWorkLog, removeWorkLog, updateWorkLog, saveArchive
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
