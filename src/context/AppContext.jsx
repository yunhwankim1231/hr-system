import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

// 초기 단일 법인 데이터
export const initialCompany = {
  id: 'C1',
  name: '명진기업(주)'
};

export const initialRates = {
  nationalPension: 4.5,
  healthInsurance: 3.545,
  longTermCareRatio: 12.95,
  employmentInsurance: 0.9,
  workersComp: 0.75,
  incomeTaxSteps: [
    { over: 0, upTo: 1060000, rate: 0, fixed: 0 },
    { over: 1060000, upTo: 1500000, rate: 0.005, fixed: 0 },
    { over: 1500000, upTo: 2500000, rate: 0.012, fixed: 2200 },
    { over: 2500000, upTo: 3500000, rate: 0.025, fixed: 14200 },
    { over: 3500000, upTo: 5000000, rate: 0.045, fixed: 39200 },
    { over: 5000000, upTo: 7000000, rate: 0.075, fixed: 106700 },
    { over: 7000000, upTo: 10000000, rate: 0.12, fixed: 256700 },
    { over: 10000000, upTo: 99999999, rate: 0.18, fixed: 616700 }
  ],
  childDeduction: { 1: 20830, 2: 45830, 3: 79160 }
};

const AppContext = createContext();

export function AppProvider({ children }) {
  const [company, setCompany] = useState(initialCompany);
  const [employees, setEmployees] = useState([]);
  const [dailyWorkers, setDailyWorkers] = useState([]);
  const [dailyWorkLogs, setDailyWorkLogs] = useState([]);
  const [insuranceRates, setInsuranceRates] = useState(initialRates);
  const [payrollArchives, setPayrollArchives] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [calendarNotes, setCalendarNotes] = useState({});
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 초기 데이터 로드 및 마이그레이션 로직
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: dbEmps } = await supabase.from('employees').select('*');
        const { data: dbDailyWorkers } = await supabase.from('daily_workers').select('*');
        const { data: dbLogs } = await supabase.from('daily_work_logs').select('*');
        const { data: dbLeave } = await supabase.from('leave_management').select('*');
        const { data: dbSettings } = await supabase.from('system_settings').select('value').eq('key', 'insurance_rates').single();
        const { data: dbCalendarNotes } = await supabase.from('system_settings').select('value').eq('key', 'calendar_notes').single();

        const mappedEmps = (dbEmps || []).map(e => ({
          ...e,
          extra_pays: typeof e.addons === 'string' ? JSON.parse(e.addons) : (e.addons || []),
          children_count: e.children_count !== undefined ? e.children_count : 0,
          work_hours: e.work_hours !== undefined ? e.work_hours : 8
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
          setLeaveRecords(dbLeave || []);
          const savedArchives = localStorage.getItem('payrollArchives');
          if (savedArchives) setPayrollArchives(JSON.parse(savedArchives));
          
          const savedCerts = localStorage.getItem('certificateHistory');
          if (savedCerts) setCertificates(JSON.parse(savedCerts));

          if (dbSettings) setInsuranceRates(dbSettings.value);
          if (dbCalendarNotes) setCalendarNotes(dbCalendarNotes.value);
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
      children_count: rest.children_count || 0,
      work_hours: rest.work_hours || 8,
      addons: JSON.stringify(extra_pays || [])
    };
    
    const { error } = await supabase.from('employees').insert([payload]);
    if (error) {
      console.error('DB 저장 실패:', error.message);
      // children_count 또는 work_hours 컬럼이 없으면 해당 필드 제외 후 재시도
      if (error.message && (error.message.includes('children_count') || error.message.includes('work_hours'))) {
        const { children_count, work_hours, ...fallbackPayload } = payload;
        const { error: retryError } = await supabase.from('employees').insert([fallbackPayload]);
        if (!retryError) {
          setEmployees([...employees, { ...payload, extra_pays: extra_pays || [] }]);
          alert('등록 성공! (단, 일부 특수 컬럼은 DB 구조에 따라 영구 저장되지 않을 수 있습니다)');
          return;
        }
      }
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
    if (payload.children_count !== undefined) payload.children_count = Number(payload.children_count) || 0;
    if (payload.work_hours !== undefined) payload.work_hours = Number(payload.work_hours) || 8;
    payload.dependents = Number(payload.dependents) || 1;
    if (extra_pays) payload.addons = JSON.stringify(extra_pays);

    // 1. 즉시 로컬 상태 업데이트 (낙관적 업데이트)
    const originalEmps = [...employees];
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updatedData } : emp));

    // 2. DB 업데이트 시도
    const { error } = await supabase.from('employees').update(payload).eq('id', id);
    if (error) {
      console.error('DB 수정 실패:', error.message);
      if (error.message && (error.message.includes('children_count') || error.message.includes('work_hours'))) {
        const { children_count, work_hours, ...fallbackPayload } = payload;
        const { error: retryError } = await supabase.from('employees').update(fallbackPayload).eq('id', id);
        if (retryError) {
          // 실패 시 롤백
          setEmployees(originalEmps);
          alert('저장 실패: ' + retryError.message);
        }
      } else {
        setEmployees(originalEmps);
        alert('저장 실패: ' + error.message);
      }
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

  const updateCalendarNotes = async (newNotes) => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'calendar_notes', value: newNotes });
    if (!error) setCalendarNotes(newNotes);
  };

  const saveArchive = (year, month, snapshotData) => {
    setPayrollArchives(prev => {
      const filtered = prev.filter(p => !(p.year === year && p.month === month));
      const newArchives = [...filtered, { year, month, data: snapshotData, finalizedAt: new Date().toISOString() }];
      localStorage.setItem('payrollArchives', JSON.stringify(newArchives));
      return newArchives;
    });
  };

  const addCertificate = (cert) => {
    setCertificates(prev => {
      const newCerts = [{ ...cert, id: `CERT-${Date.now()}`, issuedAt: new Date().toISOString() }, ...prev];
      localStorage.setItem('certificateHistory', JSON.stringify(newCerts));
      return newCerts;
    });
  };

  const addLeaveRecord = async (record) => {
    const { error, data } = await supabase.from('leave_management').insert([record]).select();
    if (!error && data) {
      setLeaveRecords([...leaveRecords, data[0]]);
    } else if (error) {
      console.error('연차 기록 저장 실패:', error.message);
      alert('연차 저장 실패: ' + error.message + '\n(팁: DB에 LeaveManagement 테이블이 생성되어 있는지 확인해주세요)');
    }
  };

  const removeLeaveRecord = async (empId, year) => {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    const { data: targetRecords, error: fetchError } = await supabase
      .from('leave_management')
      .select('id')
      .eq('employee_id', empId)
      .gte('leave_date', yearStart)
      .lte('leave_date', yearEnd)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      alert('기록 조회 실패: ' + fetchError.message);
      return;
    }

    if (targetRecords && targetRecords.length > 0) {
      const { error: deleteError } = await supabase.from('leave_management').delete().eq('id', targetRecords[0].id);
      if (!deleteError) {
        setLeaveRecords(leaveRecords.filter(r => r.id !== targetRecords[0].id));
      } else {
        alert('기록 삭제 실패: ' + deleteError.message);
      }
    }
  };

  return (
    <AppContext.Provider value={{
      company, employees, dailyWorkers, dailyWorkLogs, insuranceRates, payrollArchives, certificates, calendarNotes, leaveRecords, loading,
      setInsuranceRates: updateRates, setCalendarNotes: updateCalendarNotes, addEmployee, updateEmployee, resignEmployee, cancelResignation,
      addDailyWorker, removeDailyWorker, addWorkLog, removeWorkLog, updateWorkLog, saveArchive, addCertificate, addLeaveRecord, removeLeaveRecord, setLeaveRecords
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
