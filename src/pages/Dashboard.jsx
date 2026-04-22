import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll } from '../utils/payrollCalculations';
import { Users, CreditCard, ShieldCheck, Bell, Settings, X } from 'lucide-react';

export default function Dashboard() {
  const { company, employees, insuranceRates, setInsuranceRates } = useAppContext();
  
  const [showRateModal, setShowRateModal] = useState(false);
  const [editingRates, setEditingRates] = useState({});
  
  // 데이터 연산
  const dashboardData = useMemo(() => {
    let totalSalaries = 0;
    let totalInsurances = 0;
    let notifications = [];

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    employees.forEach(emp => {
      // 퇴사자는 통계에서 제외할지 결정 (일단 이번달 급여가 나갈 수 있으므로 포함하거나, 당월 퇴사자만 포함 등. 우선 모두 계산해봄)
      const payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
      
      totalSalaries += payroll.taxableTotal;
      // 회사 부담금 포함 4대보험 (편의상 근로자부담금 * 2 + 산재보험으로 단순화 계산)
      totalInsurances += (payroll.totalDeductions * 2) + payroll.workersComp;

      if (!emp.resignation_date) {
        // 생일 알림 (재직자만)
        const birthMonth = new Date(emp.birth_date).getMonth();
        if (birthMonth === today.getMonth()) {
          notifications.push({ id: `b-${emp.id}`, text: `🎉 ${emp.name}님 생일입니다.`, type: 'info' });
        }

        // 수습 종료 알림
        if (emp.probation_end_date) {
          const pDate = new Date(emp.probation_end_date);
          if (pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
            notifications.push({ id: `p-${emp.id}`, text: `🎓 ${emp.name}님 수습 기간이 종료됩니다. (${emp.probation_end_date})`, type: 'warning' });
          }
        }

        // 1. 당월 신규 입사자 알림
        const jDate = new Date(emp.join_date);
        if (jDate.getMonth() === today.getMonth() && jDate.getFullYear() === today.getFullYear()) {
          notifications.push({ id: `j-${emp.id}`, text: `👏 이번 달 신규 입사자: ${emp.name}님 (${emp.join_date})`, type: 'info' });
        }
      }

      // 2. 당월 퇴사자 알림 (퇴사 처리된 인원 포함)
      if (emp.resignation_date) {
        const rDate = new Date(emp.resignation_date);
        if (rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear()) {
          notifications.push({ id: `r-${emp.id}`, text: `🏃 이번 달 퇴사 예정/완료: ${emp.name}님 (${emp.resignation_date})`, type: 'danger' });
        }
      }

      // 3. 국민연금 납부 제외 대상자 알림 (만 60세 도달)
      if (!emp.resignation_date) {
        const payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
        if (payroll.ageContext.age >= 60 && !emp.continue_national_pension) {
          notifications.push({ id: `np-${emp.id}`, text: `🛡️ 국민연금 제외 대상: ${emp.name}님 (만 ${payroll.ageContext.age}세 도달)`, type: 'info' });
        }
      }
    });

    // 재직중인 인원만 카운트
    const activeHeadcount = employees.filter(e => !e.resignation_date).length;

    return {
      headcount: activeHeadcount,
      totalSalaries,
      totalInsurances,
      notifications
    };
  }, [company, employees]);

  const handleEditRatesClick = () => {
    const password = prompt("관리자 비밀번호를 입력하세요.");
    if (password === "짱구123") {
      setEditingRates({ ...insuranceRates });
      setShowRateModal(true);
    } else if (password !== null) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const [activeTab, setActiveTab] = useState('insurance'); // insurance | incomeTax

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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <span>구간 시작(초과)</span><span>구간 종료(이하)</span><span>세율(소수점)</span>
                  </div>
                  {(editingRates.incomeTaxSteps || []).map((step, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <input 
                        type="text" 
                        value={step.over.toLocaleString()} 
                        onChange={(e) => updateIncomeTaxStep(i, 'over', e.target.value)} 
                        style={smallInputStyle} 
                      />
                      <input 
                        type="text" 
                        value={step.upTo.toLocaleString()} 
                        onChange={(e) => updateIncomeTaxStep(i, 'upTo', e.target.value)} 
                        style={smallInputStyle} 
                      />
                      <input 
                        type="number" 
                        step="0.001" 
                        value={step.rate} 
                        onChange={(e) => updateIncomeTaxStep(i, 'rate', e.target.value)} 
                        style={smallInputStyle} 
                      />
                    </div>
                  ))}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>* 자녀 세액 공제 (연령 8~20세)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ flex: '1 1 120px' }}>
                        1명: <input 
                          type="text" 
                          value={(editingRates.childDeduction?.[1] || 0).toLocaleString()} 
                          onChange={(e) => {
                              const numericVal = e.target.value.replace(/[^0-9]/g, '');
                              setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 1: Number(numericVal) }});
                          }} 
                          style={{ ...smallInputStyle, width: '70px', display: 'inline' }} 
                        />
                      </div>
                      <div style={{ flex: '1 1 120px' }}>
                        2명: <input 
                          type="text" 
                          value={(editingRates.childDeduction?.[2] || 0).toLocaleString()} 
                          onChange={(e) => {
                              const numericVal = e.target.value.replace(/[^0-9]/g, '');
                              setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 2: Number(numericVal) }});
                          }} 
                          style={{ ...smallInputStyle, width: '70px', display: 'inline' }} 
                        />
                      </div>
                      <div style={{ flex: '1 1 120px' }}>
                        3명+: <input 
                          type="text" 
                          value={(editingRates.childDeduction?.[3] || 0).toLocaleString()} 
                          onChange={(e) => {
                              const numericVal = e.target.value.replace(/[^0-9]/g, '');
                              setEditingRates({...editingRates, childDeduction: { ...editingRates.childDeduction, 3: Number(numericVal) }});
                          }} 
                          style={{ ...smallInputStyle, width: '70px', display: 'inline' }} 
                        />
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Users className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>현재 재직 인원수</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }} className="text-gradient">
            {dashboardData.headcount.toLocaleString()} <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <CreditCard className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>이번 달 과세 급여 총액</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {dashboardData.totalSalaries.toLocaleString()} <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>원</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ShieldCheck className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>추정 총 4대보험/산재 (회사부담 포함)</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {dashboardData.totalInsurances.toLocaleString()} <span style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>원</span>
          </div>
        </div>
      </div>

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

      <div className="glass-card">
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
