import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll } from '../utils/payrollCalculations';
import { calculateAnnualLeave } from '../utils/leaveCalculations';
import { Search } from 'lucide-react';

export default function Payslips() {
  const { company, employees, insuranceRates } = useAppContext();
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWorkplace, setFilterWorkplace] = useState('all');
  const [checkedIds, setCheckedIds] = useState(new Set());

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const getEmpPayroll = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;
    const payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
    const leave = calculateAnnualLeave(emp.join_date);
    return { emp, company, payroll, leave };
  };

  const currentData = selectedEmp ? getEmpPayroll(selectedEmp) : null;

  const workplaceList = [...new Set(employees.map(e => e.workplace).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    const matchesText = !q || 
      emp.name.toLowerCase().includes(q) || 
      (emp.phone && emp.phone.includes(q));
    
    const matchesWorkplace = filterWorkplace === 'all' || (emp.workplace || '') === filterWorkplace;
    
    return matchesText && matchesWorkplace;
  });

  const handleCheckAll = (e) => {
    if (e.target.checked) {
      setCheckedIds(new Set(filteredEmployees.map(emp => emp.id)));
    } else {
      setCheckedIds(new Set());
    }
  };

  const handleCheckOne = (empId) => {
    const next = new Set(checkedIds);
    if (next.has(empId)) {
      next.delete(empId);
    } else {
      next.add(empId);
    }
    setCheckedIds(next);
  };

  // 공통 명세서 렌더링 컴포넌트 (싱글/벌크 공용)
  const renderPayslipContent = (data) => (
    <div className="payslip-item" style={{ background: '#ffffff', color: '#111827', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{currentMonthStr} 급여명세서</h2>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>{data.company.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>성명:</strong> {data.emp.name}</p>
          <p><strong>생년월일:</strong> {data.emp.birth_date} (만 {data.payroll.ageContext.age}세)</p>
          <p><strong>입사일:</strong> {data.emp.join_date}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
        {/* 지급 내역 */}
        <div>
          <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px', color: '#3b82f6' }}>지급 내역</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>기본급</span>
            <span>{data.payroll.basePay.toLocaleString()}원</span>
          </div>
          {data.payroll.extraPays && data.payroll.extraPays.map((ep, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>{ep.name}{ep.isTaxFree ? <span style={{ fontSize: '11px', color: 'var(--success-color)', marginLeft: '4px' }}>(비과세)</span> : ''}</span>
              <span>{ep.amount.toLocaleString()}원</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6b7280' }}>
            <span>연장 근로 수당 (예시, 0h)</span>
            <span>0원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <span>과세 지급 총액</span>
            <span>{data.payroll.taxableTotal.toLocaleString()}원</span>
          </div>
        </div>

        {/* 공제 내역 */}
        <div>
          <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px', color: '#ef4444' }}>공제 내역</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>국민연금 {data.payroll.ageContext.age >= 60 && !data.emp.continue_national_pension ? '(면제)' : ''}</span>
            <span>{data.payroll.nationalPension.toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>건강보험</span>
            <span>{data.payroll.healthInsurance.toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>장기요양보험</span>
            <span>{data.payroll.longTermCare.toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>고용보험 {data.payroll.ageContext.age >= 65 ? '(실업급여 면제)' : ''}</span>
            <span>{data.payroll.employmentInsurance.toLocaleString()}원</span>
          </div>
          {/* 소득세 추가 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>소득세 / 지방소득세</span>
            <span>{(data.payroll.incomeTax + data.payroll.residentTax).toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <span>공제 총액</span>
            <span>{data.payroll.totalDeductions.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* 실 수령액 */}
      <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>차인지급액 (실수령액)</span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{data.payroll.netPay.toLocaleString()}원</span>
      </div>

      <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e3a8a' }}>계산 방법 명시 (근로기준법 필수)</h4>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
          <li><strong>급여 산정:</strong> {data.payroll.calculationMethod}</li>
          <li><strong>연장/야간/휴일:</strong> 해당 월의 연장/야간/휴일 근로 시간은 0시간으로 산정됨.</li>
          <li><strong>잔여 연차:</strong> 총 발생 연차 {data.leave}개 중 미사용 연차 {data.leave}개 남음.</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <div style={{ display: 'flex', gap: '32px', height: '100%', flex: 1, overflow: 'hidden' }}>
        {/* 임직원 리스트 */}
        <div className="glass-card no-print" style={{ width: '320px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ marginBottom: '16px' }}>임직원 명단</h3>
            
            {/* 검색 및 필터 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="이름 검색" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              {workplaceList.length > 0 && (
                <select 
                  value={filterWorkplace} 
                  onChange={e => setFilterWorkplace(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all" style={{ background: '#0f172a' }}>사업장 전체</option>
                  {workplaceList.map(wp => (
                    <option key={wp} value={wp} style={{ background: '#0f172a' }}>{wp}</option>
                  ))}
                </select>
              )}
            </div>

            {/* 일괄 선택 컨트롤 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  onChange={handleCheckAll} 
                  checked={filteredEmployees.length > 0 && checkedIds.size === filteredEmployees.length} 
                  style={{ cursor: 'pointer' }}
                />
                전체 선택 ({checkedIds.size}명)
              </label>
              {checkedIds.size > 0 && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => window.print()}
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
                >
                  일괄 PDF 내보내기
                </button>
              )}
            </div>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {filteredEmployees.map(emp => (
              <li key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  checked={checkedIds.has(emp.id)}
                  onChange={() => handleCheckOne(emp.id)}
                  style={{ cursor: 'pointer' }}
                />
                <button 
                  onClick={() => { setSelectedEmp(emp.id); }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    background: selectedEmp === emp.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '8px',
                    color: emp.resignation_date ? 'var(--text-secondary)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <p style={{ margin: 0, fontWeight: '500' }}>{emp.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {emp.employment_type} {emp.resignation_date ? ' (퇴사)' : ''}
                    {emp.workplace ? ` · ${emp.workplace}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* 급여 명세서 뷰어 (화면용) */}
        <div style={{ flex: 1, overflowY: 'auto' }} className="no-print">
          {currentData ? (
            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', color: '#111827', padding: '40px' }}>
              {renderPayslipContent(currentData)}
              
              <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  명세서 PDF 저장 / 인쇄
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              좌측에서 직원을 선택하거나 체크하여 일괄 내보내기를 진행해주세요.
            </div>
          )}
        </div>
      </div>

      {/* 인쇄 전용 레이아웃 (일괄 출력용) */}
      <div className="print-only">
        {checkedIds.size > 0 ? (
          Array.from(checkedIds).map((empId, index) => {
            const data = getEmpPayroll(empId);
            if (!data) return null;
            return (
              <div key={empId} className="page-break" style={{ padding: '0 0 24px 0' }}>
                {renderPayslipContent(data)}
              </div>
            );
          })
        ) : (
          currentData && (
            <div style={{ padding: '20px' }}>
              {renderPayslipContent(currentData)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
