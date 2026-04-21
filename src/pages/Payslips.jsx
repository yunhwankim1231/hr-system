import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll } from '../utils/payrollCalculations';
import { calculateAnnualLeave } from '../utils/leaveCalculations';
import { Search, Calendar, Printer, FileText } from 'lucide-react';

export default function Payslips() {
  const { company, employees, insuranceRates, payrollArchives } = useAppContext();
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWorkplace, setFilterWorkplace] = useState('all');
  const [checkedIds, setCheckedIds] = useState(new Set());

  // 년/월 선택 상태 추가
  const today = new Date();
  const [targetYear, setTargetYear] = useState(today.getFullYear());
  const [targetMonth, setTargetMonth] = useState(today.getMonth() + 1);

  const targetMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  // 마감 데이터 및 상세 계산 데이터 가져오기
  const getEmpPayroll = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;

    // 해당 월의 마감 기록 확인
    const archive = payrollArchives.find(p => p.year === targetYear && p.month === targetMonth);
    const archivedData = archive ? archive.data.find(d => d.emp.id === empId) : null;

    let payroll;
    if (archivedData) {
      // 마감된 데이터가 있으면 해당 시점의 기록 사용
      payroll = {
        basePay: archivedData.earnings.find(e => e.id === 'base')?.amount || 0,
        extraPays: archivedData.earnings.filter(e => e.id !== 'base'),
        taxableTotal: archivedData.taxableTotal,
        nationalPension: archivedData.deductions.find(d => d.id === 'np')?.amount || 0,
        healthInsurance: archivedData.deductions.find(d => d.id === 'hi')?.amount || 0,
        longTermCare: archivedData.deductions.find(d => d.id === 'ltc')?.amount || 0,
        employmentInsurance: archivedData.deductions.find(d => d.id === 'ei')?.amount || 0,
        incomeTax: archivedData.deductions.find(d => d.id === 'it')?.amount || 0,
        residentTax: archivedData.deductions.find(d => d.id === 'rt')?.amount || 0,
        totalDeductions: archivedData.totalDeductions,
        netPay: archivedData.netPay,
        calculationMethod: archivedData.calculationMethod || '마감된 데이터',
        ageContext: { age: 0 } // 아카이브 시점 나이 계산 로직 필요 시 추가
      };
      
      // 나이 계산은 명세서 표시용으로 현재 기준으로 보완
      const pTmp = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: targetMonthStr });
      payroll.ageContext = pTmp.ageContext;
    } else {
      // 마감 내역이 없으면 현재 설정 기준으로 실시간 계산 (미리보기)
      payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: targetMonthStr });
    }

    const leave = calculateAnnualLeave(emp.join_date);
    return { emp, company, payroll, leave, isArchived: !!archivedData };
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

  const renderPayslipContent = (data) => (
    <div className="payslip-item" style={{ background: '#ffffff', color: '#111827', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: '24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{targetYear}년 {targetMonth}월 급여명세서</h2>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>{data.company.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>성명:</strong> {data.emp.name}</p>
          <p><strong>생년월일:</strong> {data.emp.birth_date} (만 {data.payroll.ageContext.age}세)</p>
          <p><strong>입사일:</strong> {data.emp.join_date}</p>
          {!data.isArchived && <p style={{ color: 'var(--danger-color)', fontSize: '11px', fontWeight: 'bold' }}>[급여 마감 전 미리보기]</p>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '24px' }}>
        <div>
          <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px', color: '#3b82f6' }}>지급 내역</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>기본급</span>
            <span>{data.payroll.basePay.toLocaleString()}원</span>
          </div>
          {data.payroll.extraPays && data.payroll.extraPays.map((ep, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>{ep.name}{ep.isTaxFree ? <span style={{ fontSize: '11px', color: '#10b981', marginLeft: '4px' }}>(비과세)</span> : ''}</span>
              <span>{ep.amount.toLocaleString()}원</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <span>과세 지급 총액</span>
            <span>{data.payroll.taxableTotal.toLocaleString()}원</span>
          </div>
        </div>

        <div>
          <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '8px', marginBottom: '12px', color: '#ef4444' }}>공제 내역</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>국민연금</span>
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
            <span>고용보험</span>
            <span>{data.payroll.employmentInsurance.toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>소득세 / 지방세</span>
            <span>{(data.payroll.incomeTax + data.payroll.residentTax).toLocaleString()}원</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <span>공제 총액</span>
            <span>{data.payroll.totalDeductions.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>차인지급액 (실수령액)</span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{data.payroll.netPay.toLocaleString()}원</span>
      </div>

      <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
        <h4 style={{ fontWeight: 'bold', marginBottom: '8px', color: '#1e3a8a' }}>계산 방법 및 안내</h4>
        <ul style={{ listStyle: 'disc', paddingLeft: '20px', fontSize: '14px', color: '#1e40af' }}>
          <li><strong>급여 산정:</strong> {data.payroll.calculationMethod}</li>
          <li><strong>잔여 연차:</strong> 총 {data.leave}개 중 미사용 연차 {data.leave}개 (현시점 기준)</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>급여 명세서</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>과거 마감 기록 전용 명세서 출력 및 관리</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
            <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={selectStyle}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}년</option>)}
            </select>
            <select value={targetMonth} onChange={e => setTargetMonth(Number(e.target.value))} style={selectStyle}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m} style={{ background: '#0f172a' }}>{m}월</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', height: '100%', flex: 1, overflow: 'hidden' }}>
        <div className="glass-card no-print" style={{ width: '320px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="이름 검색" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {workplaceList.length > 0 && (
                <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)} style={inputStyle}>
                  <option value="all" style={{ background: '#0f172a' }}>사업장 전체</option>
                  {workplaceList.map(wp => <option key={wp} value={wp} style={{ background: '#0f172a' }}>{wp}</option>)}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                <input type="checkbox" onChange={handleCheckAll} checked={filteredEmployees.length > 0 && checkedIds.size === filteredEmployees.length} />
                전체 선택 ({checkedIds.size}명)
              </label>
              {checkedIds.size > 0 && (
                <button className="btn btn-primary" onClick={() => window.print()} style={{ padding: '4px 10px', fontSize: '11px' }}>일괄 인쇄</button>
              )}
            </div>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {filteredEmployees.map(emp => (
              <li key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={checkedIds.has(emp.id)} onChange={() => handleCheckOne(emp.id)} />
                <button 
                  onClick={() => setSelectedEmp(emp.id)}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                    background: selectedEmp === emp.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    border: '1px solid var(--card-border)', color: 'white'
                  }}
                >
                  <p style={{ margin: 0, fontSize: '14px' }}>{emp.name}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }} className="no-print">
          {currentData ? (
            <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', color: '#111827', padding: '40px' }}>
              {renderPayslipContent(currentData)}
              <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '24px', marginTop: '24px' }}>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
                  <Printer size={18} /> 명세서 PDF 저장 / 인쇄
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              조회할 년/월과 직원을 선택해 주세요.
            </div>
          )}
        </div>
      </div>

      <div className="print-only">
        {checkedIds.size > 0 ? Array.from(checkedIds).map(id => {
          const data = getEmpPayroll(id);
          return data ? <div key={id} style={{ pageBreakAfter: 'always' }}>{renderPayslipContent(data)}</div> : null;
        }) : currentData && renderPayslipContent(currentData)}
      </div>
    </div>
  );
}

const selectStyle = { background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', outline: 'none' };
