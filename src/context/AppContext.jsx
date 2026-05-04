import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

// 초기 단일 법인 데이터
export const initialCompany = {
  id: 'C1',
  name: '명진기업(주)',
  seal_url: null
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
  childDeduction: { 1: 20830, 2: 45830, 3: 79160 },
  default_income_tax_rate: 100
};

// 초기 직원 카테고리 (사업장, 직무, 직책)
export const initialEmployeeCategories = {
  workplaces: [],
  roles: [],
  positions: [],
  banks: [
    'KB국민은행', '신한은행', '하나은행', '우리은행', 'SC제일은행', 'iM뱅크(대구)',
    'NH농협은행', 'IBK기업은행', '수협은행', '한국산업은행',
    '부산은행', '경남은행', '광주은행', '전북은행', '제주은행',
    '카카오뱅크', '케이뱅크', '토스뱅크',
    '우체국', '새마을금고', '신협', '산림조합',
    'KB증권', 'NH투자증권', '미래에셋증권', '삼성증권', '한국투자증권', '키움증권', '교보증권'
  ],
  approval_lines: ['사원', '대리', '과장', '차장', '부장', '이사', '상무', '전무', '사장']
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
  const [taxRates, setTaxRates] = useState([]); // 퇴직소득 세율 추가
  const [employeeCategories, setEmployeeCategories] = useState(initialEmployeeCategories);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1. 초기 데이터 로드 및 마이그레이션 로직
  useEffect(() => {
    async function initData() {
      setLoading(true);
      try {
        const { data: dbEmps } = await supabase.from('employees').select('*');
        const { data: dbDailyWorkers } = await supabase.from('daily_workers').select('*');
        const { data: dbLogs } = await supabase.from('daily_work_logs').select('*');
        const { data: dbLeave } = await supabase.from('leave_management').select('*');
        const { data: dbCerts } = await supabase.from('certificates').select('*').order('created_at', { ascending: false });
        const { data: dbSettings } = await supabase.from('system_settings').select('value').eq('key', 'insurance_rates').single();
        const { data: dbCalendarNotes } = await supabase.from('system_settings').select('value').eq('key', 'calendar_notes').single();
        const { data: dbPayrollArchives } = await supabase.from('system_settings').select('value').eq('key', 'payroll_archives').single();
        const { data: dbCompanyInfo } = await supabase.from('system_settings').select('value').eq('key', 'company_info').single();
        const { data: dbEmployeeCategories } = await supabase.from('system_settings').select('value').eq('key', 'employee_categories').single();
        const { data: dbTaxRates } = await supabase.from('tax_rate_table').select('*').order('min_amount', { ascending: true });

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
          setCertificates(dbCerts || []);

          if (dbSettings) setInsuranceRates(dbSettings.value);
          if (dbCalendarNotes) setCalendarNotes(dbCalendarNotes.value);
          if (dbCompanyInfo) setCompany(dbCompanyInfo.value);
          if (dbEmployeeCategories) {
            // 기존 데이터와 초기값 병합 (새로운 필드 추가 대응)
            setEmployeeCategories({
              ...initialEmployeeCategories,
              ...dbEmployeeCategories.value
            });
          }
          if (dbTaxRates) setTaxRates(dbTaxRates);

          if (dbPayrollArchives) {
            setPayrollArchives(dbPayrollArchives.value);
          } else {
            // DB에 없으면 로컬 스토리지 마이그레이션 체크
            const localArchives = JSON.parse(localStorage.getItem('payrollArchives') || '[]');
            if (localArchives.length > 0) {
              console.log('급여 내역 마이그레이션 시작...');
              setPayrollArchives(localArchives);
              await supabase.from('system_settings').upsert({ key: 'payroll_archives', value: localArchives });
            }
          }

          // 로컬에만 데이터가 있고 DB에 없는 경우 마이그레이션 체크
          if ((!dbCerts || dbCerts.length === 0) && localStorage.getItem('certificateHistory')) {
            console.log('증명서 기록 마이그레이션 시작...');
            migrateCertificates();
          }
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

  const migrateCertificates = async () => {
    const localCerts = JSON.parse(localStorage.getItem('certificateHistory') || '[]');
    if (localCerts.length > 0) {
      const { data, error } = await supabase.from('certificates').insert(localCerts.map(c => ({
        emp_name: c.empName,
        cert_no: c.certNo,
        type: c.type,
        purpose: c.purpose,
        issue_date: c.issueDate,
        created_at: c.issuedAt || new Date().toISOString()
      })));
      if (!error) {
        const { data: dbCerts } = await supabase.from('certificates').select('*').order('created_at', { ascending: false });
        setCertificates(dbCerts || []);
        console.log('증명서 마이그레이션 완료');
      }
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
      resident_number: rest.resident_number,
      addons: JSON.stringify(extra_pays || []),
      has_irp_account: rest.has_irp_account || false,
      irp_account_number: rest.irp_account_number || '',
      irp_provider: rest.irp_provider || '',
      income_tax_rate: rest.income_tax_rate || 100
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
    const { extra_pays, employee_id, ...rest } = updatedData;
    const payload = { ...rest };
    if (payload.children_count !== undefined) payload.children_count = Number(payload.children_count) || 0;
    if (payload.work_hours !== undefined) payload.work_hours = Number(payload.work_hours) || 8;
    payload.dependents = Number(payload.dependents) || 1;
    if (extra_pays) payload.addons = JSON.stringify(extra_pays);
    
    // IRP 필드 명시적 추가
    if (updatedData.has_irp_account !== undefined) payload.has_irp_account = updatedData.has_irp_account;
    if (updatedData.irp_account_number !== undefined) payload.irp_account_number = updatedData.irp_account_number;
    if (updatedData.irp_provider !== undefined) payload.irp_provider = updatedData.irp_provider;
    if (updatedData.income_tax_rate !== undefined) payload.income_tax_rate = updatedData.income_tax_rate;

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
    if (!error) {
      setDailyWorkers([...dailyWorkers, worker]);
      return true;
    } else {
      console.error('일용직 등록 실패:', error);
      alert('등록 실패: ' + error.message);
      return false;
    }
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
  const updateEmployeeCategories = async (newCategories) => {
    setEmployeeCategories(newCategories);
    const { error } = await supabase.from('system_settings').upsert({ key: 'employee_categories', value: newCategories });
    if (error) console.error('직원 카테고리 저장 실패:', error.message);
  };

  const updateCompany = async (newCompany) => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'company_info', value: newCompany });
    if (!error) setCompany(newCompany);
  };

  const updateRates = async (newRates) => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'insurance_rates', value: newRates });
    if (!error) setInsuranceRates(newRates);
  };

  const updateCalendarNotes = async (newNotes) => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'calendar_notes', value: newNotes });
    if (!error) setCalendarNotes(newNotes);
  };

  const saveArchive = async (year, month, snapshotData) => {
    const filtered = payrollArchives.filter(p => !(p.year === year && p.month === month));
    const newArchives = [...filtered, { year, month, data: snapshotData, finalizedAt: new Date().toISOString() }];
    
    setPayrollArchives(newArchives);
    const { error } = await supabase.from('system_settings').upsert({ key: 'payroll_archives', value: newArchives });
    if (error) {
      console.error('클라우드 저장 실패:', error.message);
      // 클라우드 실패해도 로컬에는 남겨둠 (백업용)
      localStorage.setItem('payrollArchives', JSON.stringify(newArchives));
    }
  };

  const removeArchive = async (year, month) => {
    const newArchives = payrollArchives.filter(p => !(p.year === year && p.month === month));
    setPayrollArchives(newArchives);
    await supabase.from('system_settings').upsert({ key: 'payroll_archives', value: newArchives });
    localStorage.setItem('payrollArchives', JSON.stringify(newArchives));
  };

  const addCertificate = async (cert) => {
    const payload = {
      emp_name: cert.empName,
      cert_no: cert.certNo,
      type: cert.type,
      purpose: cert.purpose,
      issue_date: cert.issueDate,
      employee_id: cert.employee_id || null // 연동된 직원 ID가 있으면 저장
    };

    const { data, error } = await supabase.from('certificates').insert([payload]).select();
    
    if (!error && data) {
      setCertificates(prev => [data[0], ...prev]);
    } else if (error) {
      console.error('증명서 저장 실패:', error.message);
      alert('증명서 기록 저장 실패: ' + error.message);
    }
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

  const toggleLeaveRecord = async (empId, dateStr, currentVal) => {
    // 0 -> 1.0 -> 0.5 -> 0 순환
    let nextVal = 0;
    if (currentVal === 0) nextVal = 1.0;
    else if (currentVal === 1.0) nextVal = 0.5;
    else nextVal = 0;

    try {
      // 1. 기존 해당 날짜 기록 삭제
      await supabase
        .from('leave_management')
        .delete()
        .eq('employee_id', empId)
        .eq('leave_date', dateStr);

      // 2. 새로운 기록 추가 (nextVal > 0 인 경우)
      if (nextVal > 0) {
        const { data: newData, error: insError } = await supabase
          .from('leave_management')
          .insert([{
            employee_id: empId,
            leave_date: dateStr,
            leave_days: nextVal,
            status: '승인',
            reason: '캘린더 수동 기록'
          }])
          .select();

        if (insError) throw insError;
        
        if (newData && newData[0]) {
          setLeaveRecords(prev => [
            ...prev.filter(r => !(r.employee_id === empId && r.leave_date === dateStr)),
            newData[0]
          ]);
        }
      } else {
        // 삭제만 수행된 경우 상태 업데이트
        setLeaveRecords(prev => prev.filter(r => !(r.employee_id === empId && r.leave_date === dateStr)));
      }
      return true;
    } catch (err) {
      console.error('연차 기록 토글 실패:', err.message);
      return false;
    }
  };

  const getEmployeeAuditLogs = async (empId) => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'employees')
        .eq('record_id', empId)
        .order('created_at', { ascending: false });
        
      if (error) {
        // 테이블이 아직 없거나 권한 에러 시 조용히 빈 배열 리턴
        console.error('Audit logs fetch error:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  };

  return (
    <AppContext.Provider value={{
      company, employees, dailyWorkers, dailyWorkLogs, insuranceRates, payrollArchives, certificates, calendarNotes, leaveRecords, taxRates, employeeCategories, loading,
      setCompany: updateCompany, setEmployeeCategories: updateEmployeeCategories, setInsuranceRates: updateRates, setCalendarNotes: updateCalendarNotes, addEmployee, updateEmployee, resignEmployee, cancelResignation,
      addDailyWorker, removeDailyWorker, addWorkLog, removeWorkLog, updateWorkLog, saveArchive, removeArchive, addCertificate, addLeaveRecord, removeLeaveRecord, setLeaveRecords,
      toggleLeaveRecord, session, logout: () => supabase.auth.signOut(), getEmployeeAuditLogs
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
