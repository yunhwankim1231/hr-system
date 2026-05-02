import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll } from '../utils/payrollCalculations';
import { getLeaveDetails } from '../utils/leaveCalculations';
import { Users, CreditCard, ShieldCheck, Bell, Settings, X, Banknote, Clock, TrendingDown } from 'lucide-react';
import DashboardCalendar from '../components/DashboardCalendar';

export default function Dashboard() {
  const { company, employees, insuranceRates, setInsuranceRates, leaveRecords } = useAppContext();
  
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRates, setEditingRates] = useState({});
  const [activeTab, setActiveTab] = useState('insurance'); // insurance | incomeTax
  
  // 데이터 연산
  const dashboardData = useMemo(() => {
    let totalSalaries = 0;
    let totalInsurances = 0;
    let totalAccruedLeave = 0;
    let totalUsedLeave = 0;
    let totalLeaveDebt = 0;
    let totalSeverancePay = 0;
    let notifications = [];

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const baseDateForLeave = new Date(currentYear, 11, 31); // 연말 기준 연차 현황

    // 연차 기록 그룹화
    const groupedLeave = {};
    (leaveRecords || []).forEach(r => {
      if (new Date(r.leave_date).getFullYear() === currentYear) {
        if (!groupedLeave[r.employee_id]) groupedLeave[r.employee_id] = [];
        groupedLeave[r.employee_id].push(r);
      }
    });

    employees.forEach(emp => {
      const payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
      
      totalSalaries += payroll.taxableTotal;
      
      // 회사 부담금 포함 4대보험
      const employeeInsurance = (payroll.nationalPension || 0) + (payroll.healthInsurance || 0) + (payroll.longTermCare || 0) + (payroll.employmentInsurance || 0);
      totalInsurances += (employeeInsurance * 2) + (payroll.workersComp || 0);

      // 연차 통계 및 부채 계산
      const workHours = Number(emp.work_hours || 8);
      const { totalLeave } = getLeaveDetails(emp.join_date, baseDateForLeave, workHours);
      const empUsed = (groupedLeave[emp.id] || []).reduce((sum, r) => sum + Number(r.leave_days), 0);
      const remaining = totalLeave - empUsed;
      
      const baseSalary = Number(emp.base_salary || 0);
      const extraPaysSum = (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalFixedMonthly = baseSalary + extraPaysSum;
      const dailyWage = (totalFixedMonthly / (workHours * 6 * 4.345)) * workHours;
      const allowance = remaining > 0 ? Math.floor(remaining * dailyWage) : 0;

      totalAccruedLeave += totalLeave;
      totalUsedLeave += empUsed;
      totalLeaveDebt += allowance;

      // 퇴직금 추계액 계산 (오늘 기준)
      const joinDate = new Date(emp.join_date);
      const diffTime = today.getTime() - joinDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 365 && !emp.resignation_date) {
        const severanceEstimate = totalFixedMonthly * (diffDays / 365);
        totalSeverancePay += Math.floor(severanceEstimate);
      }

      if (!emp.resignation_date) {
        // 알림 생성
        if (emp.probation_end_date) {
          const pDate = new Date(emp.probation_end_date);
          if (pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
            notifications.push({ id: `p-${emp.id}`, text: `🎓 ${emp.name}님 수습 기간이 종료됩니다. (${emp.probation_end_date})`, type: 'warning' });
          }
        }
        const jDate = new Date(emp.join_date);
        if (jDate.getMonth() === today.getMonth() && jDate.getFullYear() === today.getFullYear()) {
          notifications.push({ id: `j-${emp.id}`, text: `👏 이번 달 신규 입사자: ${emp.name}님 (${emp.join_date})`, type: 'info' });
        }
      }

      if (emp.resignation_date) {
        const rDate = new Date(emp.resignation_date);
        if (rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear()) {
          notifications.push({ id: `r-${emp.id}`, text: `🏃 이번 달 퇴사 예정/완료: ${emp.name}님 (${emp.resignation_date})`, type: 'danger' });
        }
      }

      if (!emp.resignation_date && emp.birth_date) {
        const bDate = new Date(emp.birth_date);
        const turned60ThisMonth = (today.getFullYear() - bDate.getFullYear() === 60) && (today.getMonth() === bDate.getMonth());
        if (turned60ThisMonth && !emp.continue_national_pension) {
          notifications.push({ id: `np-${emp.id}`, text: `🛡️ 국민연금 공제 종료 안내: ${emp.name}님께서 이번 달 만 60세가 도달하여 공제가 면제됩니다.`, type: 'warning' });
        }
      }
    });

    const activeHeadcount = employees.filter(e => !e.resignation_date).length;

    return {
      headcount: activeHeadcount,
      totalSalaries,
      totalInsurances,
      totalAccruedLeave,
      totalUsedLeave,
      totalRemainingLeave: totalAccruedLeave - totalUsedLeave,
      totalLeaveDebt,
      totalSeverancePay,
      notifications
    };
  }, [company, employees, leaveRecords, insuranceRates]);

  const handleEditRatesClick = () => {
    const password = prompt("관리자 비밀번호를 입력하세요.");
    if (password === "짱구123") {
      let ratesToEdit = { ...insuranceRates };
      if (!ratesToEdit.incomeTaxSteps || ratesToEdit.incomeTaxSteps.length === 0) {
        ratesToEdit.incomeTaxSteps = [
          { over: 0, upTo: 1060000, rate: 0, fixed: 0 },
          { over: 1060000, upTo: 1500000, rate: 0.005, fixed: 0 },
          { over: 1500000, upTo: 2500000, rate: 0.012, fixed: 2200 },
          { over: 2500000, upTo: 3500000, rate: 0.025, fixed: 14200 },
          { over: 3500000, upTo: 5000000, rate: 0.045, fixed: 39200 },
          { over: 5000000, upTo: 7000000, rate: 0.075, fixed: 106700 },
          { over: 7000000, upTo: 10000000, rate: 0.12, fixed: 256700 },
          { over: 10000000, upTo: 99999999, rate: 0.18, fixed: 616700 }
        ];
        ratesToEdit.childDeduction = { 1: 20830, 2: 45830, 3: 79160 };
      }
      setEditingRates(ratesToEdit);
      setShowRateModal(true);
    } else if (password !== null) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleRateSave = (e) => {
    e.preventDefault();
    setInsuranceRates({ ...editingRates });
    setShowRateModal(false);
  };

  const updateIncomeTaxStep = (index, field, value) => {
    const newSteps = [...(editingRates.incomeTaxSteps || [])];
    if (field === 'over' || field === 'upTo' || field === 'fixed') {
      const numericVal = value.replace(/[^0-9]/g, '');
      newSteps[index][field] = Number(numericVal);
    } else {
      newSteps[index][field] = Number(value);
    }
    setEditingRates({ ...editingRates, incomeTaxSteps: newSteps });
  };

  const handleResetIncomeTax = () => {
    const defaultIncomeTaxSteps = [
      { over: 0, upTo: 1060000, rate: 0, fixed: 0 },
      { over: 1060000, upTo: 1500000, rate: 0.005, fixed: 0 },
      { over: 1500000, upTo: 2500000, rate: 0.012, fixed: 2200 },
      { over: 2500000, upTo: 3500000, rate: 0.025, fixed: 14200 },
      { over: 3500000, upTo: 5000000, rate: 0.045, fixed: 39200 },
      { over: 5000000, upTo: 7000000, rate: 0.075, fixed: 106700 },
      { over: 7000000, upTo: 10000000, rate: 0.12, fixed: 256700 },
      { over: 10000000, upTo: 99999999, rate: 0.18, fixed: 616700 }
    ];
    setEditingRates({
      ...editingRates,
      incomeTaxSteps: defaultIncomeTaxSteps,
      childDeduction: { 1: 20830, 2: 45830, 3: 79160 }
    });
  };

  return (
    <div className="dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{company.name} 대시보드</h2>
      </div>

      {showRateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowRateModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} /> 시스템 기준 요율 설정</h3>
            
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
                <button onClick={() => setActiveTab('insurance')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeTab === 'insurance' ? 'var(--primary-color)' : 'transparent', color: 'white', cursor: 'pointer' }}>4대 보험</button>
                <button onClick={() => setActiveTab('incomeTax')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: activeTab === 'incomeTax' ? 'var(--primary-color)' : 'transparent', color: 'white', cursor: 'pointer' }}>소득세 구간</button>
            </div>

            <form onSubmit={handleRateSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeTab === 'insurance' ? (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>국민연금 (%)</label>
                    <input type="number" step="0.001" value={editingRates.nationalPension} onChange={(e) => setEditingRates({...editingRates, nationalPension: Number(e.target.value)})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>건강보험 (%)</label>
                    <input type="number" step="0.001" value={editingRates.healthInsurance} onChange={(e) => setEditingRates({...editingRates, healthInsurance: Number(e.target.value)})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>장기요양보험 (건강보험료 대비 %)</label>
                    <input type="number" step="0.001" value={editingRates.longTermCareRatio} onChange={(e) => setEditingRates({...editingRates, longTermCareRatio: Number(e.target.value)})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>고용보험 (%)</label>
                    <input type="number" step="0.001" value={editingRates.employmentInsurance} onChange={(e) => setEditingRates({...editingRates, employmentInsurance: Number(e.target.value)})} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>산재보험 (%)</label>
                    <input type="number" step="0.001" value={editingRates.workersComp} onChange={(e) => setEditingRates({...editingRates, workersComp: Number(e.target.value)})} style={inputStyle} required />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button type="button" onClick={handleResetIncomeTax} className="btn btn-outline" style={{ fontSize: '11px', padding: '4px 8px' }}>최신 세율로 초기화</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <span>구간 시작(초과)</span><span>구간 종료(이하)</span><span>세율(소수점)</span>
                  </div>
                  {(editingRates.incomeTaxSteps || []).map((step, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <input type="text" value={step.over.toLocaleString()} onChange={(e) => updateIncomeTaxStep(i, 'over', e.target.value)} style={smallInputStyle} />
                      <input type="text" value={step.upTo.toLocaleString()} onChange={(e) => updateIncomeTaxStep(i, 'upTo', e.target.value)} style={smallInputStyle} />
                      <input type="number" step="0.001" value={step.rate} onChange={(e) => updateIncomeTaxStep(i, 'rate', e.target.value)} style={smallInputStyle} />
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>* 자녀 세액 공제 (연령 8~20세)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: '1 1 120px' }}>
                        1명: <input type="text" value={(editingRates.childDeduction?.[1] || 0).toLocaleString()} onChange={(e) => {
                            const numericVal = e.target.value.replace(/[^0-9]/g, '');
                            setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 1: Number(numericVal) }});
                        }} style={{ ...smallInputStyle, width: '70px', display: 'inline' }} />
                      </div>
                      <div style={{ flex: '1 1 120px' }}>
                        2명: <input type="text" value={(editingRates.childDeduction?.[2] || 0).toLocaleString()} onChange={(e) => {
                            const numericVal = e.target.value.replace(/[^0-9]/g, '');
                            setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 2: Number(numericVal) }});
                        }} style={{ ...smallInputStyle, width: '70px', display: 'inline' }} />
                      </div>
                      <div style={{ flex: '1 1 120px' }}>
                        3명+: <input type="text" value={(editingRates.childDeduction?.[3] || 0).toLocaleString()} onChange={(e) => {
                            const numericVal = e.target.value.replace(/[^0-9]/g, '');
                            setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 3: Number(numericVal) }});
                        }} style={{ ...smallInputStyle, width: '70px', display: 'inline' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'right', marginTop: '16px' }}>
                <button type="submit" className="btn btn-primary">변경사항 저장</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 0. 현재 적용 중인 시스템 법정 기준 요율 */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>현재 적용 중인 시스템 법정 기준 요율 (근로자 부담분)</h3>
          <button onClick={handleEditRatesClick} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }}>
            <Settings size={14} style={{ marginRight: '6px' }} /> 요율 설정 변경
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>국민연금</div>
            <div style={{ fontWeight: 'bold' }}>{insuranceRates.nationalPension}%</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>건강보험</div>
            <div style={{ fontWeight: 'bold' }}>{insuranceRates.healthInsurance}%</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>장기요양보험</div>
            <div style={{ fontWeight: 'bold' }}>건강보험료의 {insuranceRates.longTermCareRatio}%</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>고용보험</div>
            <div style={{ fontWeight: 'bold' }}>{insuranceRates.employmentInsurance}%</div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>산재보험 (회사전액)</div>
            <div style={{ fontWeight: 'bold' }}>{insuranceRates.workersComp}%</div>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '16px' }}>
          * 위 요율은 최신(2024년 기준) 고시 요율을 바탕으로 하며 급여명세서 공제 항목 연산에 자동으로 적용됩니다.
        </div>
      </div>

      {/* 1. 이번 달 주요 알림 */}
      <div className="glass-card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <Bell className="text-secondary" />
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>이번 달 주요 알림</h3>
        </div>
        {dashboardData.notifications.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', padding: '20px 0' }}>이번 달 예정된 알림이 없습니다.</div>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dashboardData.notifications.map(noti => (
              <li key={noti.id} style={{ 
                padding: '16px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '8px',
                borderLeft: `4px solid ${
                  noti.type === 'info' ? 'var(--primary-color)' : 
                  noti.type === 'warning' ? 'var(--warning-color)' : 
                  'var(--danger-color)'
                }`
              }}>
                {noti.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. 달력 */}
      <DashboardCalendar />

    </div>
  );
}

const smallInputStyle = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: '6px',
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: '12px',
  outline: 'none'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  outline: 'none'
};
