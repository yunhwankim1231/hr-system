import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Printer, Calculator, User, Calendar, ArrowRight, CheckCircle, Info, Banknote } from 'lucide-react';

export default function SeveranceManagement() {
  const { employees, payrollArchives, company } = useAppContext();
  
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);
  
  // 수동 입력 필드들
  const [manualWages, setManualWages] = useState([
    { month: '', days: 30, amount: 0 },
    { month: '', days: 31, amount: 0 },
    { month: '', days: 30, amount: 0 },
  ]);
  const [bonusTotal, setBonusTotal] = useState(0); // 연간 상여 총액
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState(0); // 연차 수당

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  // 직원 선택 시 기본값 세팅
  useEffect(() => {
    if (selectedEmp) {
      const resDate = new Date(resignationDate);
      const newWages = [];
      
      for (let i = 1; i <= 3; i++) {
        const d = new Date(resDate.getFullYear(), resDate.getMonth() - i + 1, 0);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        // 해당 월의 마감 데이터가 있는지 확인
        const archive = payrollArchives.find(a => a.year === d.getFullYear() && a.month === d.getMonth() + 1);
        const empData = archive?.data.find(d => d.emp.id === selectedEmp.id);
        
        newWages.push({
          month: monthStr,
          days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
          amount: empData ? empData.taxableTotal : selectedEmp.base_salary
        });
      }
      setManualWages(newWages.reverse());
    }
  }, [selectedEmp, resignationDate, payrollArchives]);

  const calculation = useMemo(() => {
    if (!selectedEmp || !resignationDate) return null;

    const start = new Date(selectedEmp.join_date);
    const end = new Date(resignationDate);
    
    if (end < start) return { error: "퇴직일이 입사일보다 빠를 수 없습니다." };

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const isEligible = totalDays >= 365;

    const threeMonthWageTotal = manualWages.reduce((sum, w) => sum + Number(w.amount), 0);
    const threeMonthDayTotal = manualWages.reduce((sum, w) => sum + Number(w.days), 0);
    
    // 평균임금 산입액 (상여금 3/12 + 연차수당 3/12)
    const bonusPortion = (Number(bonusTotal) * 3) / 12;
    const annualLeavePortion = (Number(annualLeaveAllowance) * 3) / 12;

    const dailyAverageWage = (threeMonthWageTotal + bonusPortion + annualLeavePortion) / threeMonthDayTotal;
    const severancePay = (dailyAverageWage * 30) * (totalDays / 365);

    return {
      totalDays,
      isEligible,
      threeMonthWageTotal,
      threeMonthDayTotal,
      bonusPortion,
      annualLeavePortion,
      dailyAverageWage,
      severancePay: Math.floor(severancePay / 10) * 10, // 원단위 절사
    };
  }, [selectedEmp, resignationDate, manualWages, bonusTotal, annualLeaveAllowance]);

  const handlePrint = () => window.print();

  return (
    <div className="severance-management">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Banknote size={28} className="text-primary" /> 퇴직금 정산 관리
          </h2>
          <button className="btn btn-outline" onClick={handlePrint} disabled={!calculation || calculation.error}>
            <Printer size={18} style={{ marginRight: '8px' }} /> 정산 내역서 인쇄
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
          {/* 입력 섹션 */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-color)' }}>정산 기초 정보 입력</h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>대상 근로자 선택</label>
              <select 
                value={selectedEmpId} 
                onChange={e => setSelectedEmpId(e.target.value)}
                style={inputStyle}
              >
                <option value="">직원을 선택하세요</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id} style={{ background: '#0f172a' }}>
                    {emp.name} ({emp.resignation_date ? '퇴사자' : '재직자'})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmp && (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div className="form-group">
                    <label>입사일 (자동)</label>
                    <input type="date" value={selectedEmp.join_date} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>퇴직(예정)일</label>
                    <input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>최근 3개월 급여 내역 (평균임금 산정용)</h4>
                  {manualWages.map((w, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px' }}>{w.month}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input 
                          type="number" 
                          value={w.days} 
                          onChange={e => {
                            const newW = [...manualWages];
                            newW[idx].days = Number(e.target.value);
                            setManualWages(newW);
                          }}
                          style={{ ...inputStyle, padding: '6px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '12px' }}>일</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input 
                          type="text" 
                          value={w.amount.toLocaleString()} 
                          onChange={e => {
                            const newW = [...manualWages];
                            newW[idx].amount = Number(e.target.value.replace(/,/g, ''));
                            setManualWages(newW);
                          }}
                          style={{ ...inputStyle, padding: '6px', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: '12px' }}>원</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>연간 상여 총액</label>
                    <input 
                      type="text" 
                      value={bonusTotal.toLocaleString()} 
                      onChange={e => setBonusTotal(Number(e.target.value.replace(/,/g, '')))}
                      style={{ ...inputStyle, textAlign: 'right' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>연차 수당 (최근 1년)</label>
                    <input 
                      type="text" 
                      value={annualLeaveAllowance.toLocaleString()} 
                      onChange={e => setAnnualLeaveAllowance(Number(e.target.value.replace(/,/g, '')))}
                      style={{ ...inputStyle, textAlign: 'right' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 결과 섹션 */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-color)' }}>퇴직금 산출 결과</h3>
            
            {!selectedEmp ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Calculator size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p>근로자를 선택하면 정산이 시작됩니다.</p>
              </div>
            ) : calculation?.error ? (
              <div style={{ color: 'var(--danger-color)', padding: '20px', textAlign: 'center' }}>{calculation.error}</div>
            ) : (
              <div style={{ flex: 1, animation: 'slideInRight 0.3s ease' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>총 재직일수</span>
                    <strong style={{ fontSize: '18px' }}>{calculation.totalDays.toLocaleString()} 일</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>1일 평균임금</span>
                    <strong style={{ fontSize: '18px' }}>{Math.floor(calculation.dailyAverageWage).toLocaleString()} 원</strong>
                  </div>
                  {!calculation.isEligible && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', fontSize: '13px', marginTop: '12px', background: 'rgba(251, 191, 36, 0.1)', padding: '8px', borderRadius: '4px' }}>
                      <Info size={16} />
                      재직일수 1년(365일) 미만은 법정 퇴직금 발생 대상이 아닙니다.
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', padding: '30px 0', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>예상 퇴직금 (세전)</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#60a5fa' }}>
                    {calculation.severancePay.toLocaleString()} <span style={{ fontSize: '20px' }}>원</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  * 위 금액은 입력된 기초 데이터를 바탕으로 산출된 예상 금액이며, 실제 지급 시 퇴직소득세 등이 원천징수될 수 있습니다.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 인쇄 전용 레이아웃 */}
      {selectedEmp && calculation && !calculation.error && (
        <div className="print-only" style={{ color: '#000', padding: '20px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '30px', fontWeight: 'bold', textDecoration: 'underline' }}>퇴직금 산출 상세 내역서</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={printBoxStyle}>
              <h4 style={printLabelStyle}>1. 기본 정보</h4>
              <p><strong>성 명:</strong> {selectedEmp.name}</p>
              <p><strong>입 사 일:</strong> {selectedEmp.join_date}</p>
              <p><strong>퇴 사 일:</strong> {resignationDate}</p>
              <p><strong>재직일수:</strong> {calculation.totalDays} 일</p>
            </div>
            <div style={printBoxStyle}>
              <h4 style={printLabelStyle}>2. 회사 정보</h4>
              <p><strong>법 인 명:</strong> {company.name}</p>
              <p><strong>정 산 일:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 style={printLabelStyle}>3. 평균임금 산출 상세</h4>
            <table style={printTableStyle}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={printThStyle}>구분 (기간)</th>
                  <th style={printThStyle}>일수</th>
                  <th style={printThStyle}>기본급 및 수당</th>
                </tr>
              </thead>
              <tbody>
                {manualWages.map((w, idx) => (
                  <tr key={idx}>
                    <td style={printTdStyle}>{w.month}</td>
                    <td style={{ ...printTdStyle, textAlign: 'center' }}>{w.days} 일</td>
                    <td style={printTdStyle}>{w.amount.toLocaleString()} 원</td>
                  </tr>
                ))}
                <tr style={{ background: '#f9fafb', fontWeight: 'bold' }}>
                  <td style={printTdStyle}>합계 (A)</td>
                  <td style={{ ...printTdStyle, textAlign: 'center' }}>{calculation.threeMonthDayTotal} 일</td>
                  <td style={printTdStyle}>{calculation.threeMonthWageTotal.toLocaleString()} 원</td>
                </tr>
              </tbody>
            </table>
            
            <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ border: '1px solid #000', padding: '10px' }}>
                <strong>상여금 가산 (B):</strong> {(bonusTotal * 3 / 12).toLocaleString()} 원 <br/>
                <span style={{ fontSize: '11px' }}>(최근 1년 상여 {bonusTotal.toLocaleString()}원 × 3/12)</span>
              </div>
              <div style={{ border: '1px solid #000', padding: '10px' }}>
                <strong>연차수당 가산 (C):</strong> {(annualLeaveAllowance * 3 / 12).toLocaleString()} 원 <br/>
                <span style={{ fontSize: '11px' }}>(최근 1년 연차수당 {annualLeaveAllowance.toLocaleString()}원 × 3/12)</span>
              </div>
            </div>
            
            <div style={{ marginTop: '15px', padding: '15px', border: '2px solid #000', textAlign: 'center', background: '#f3f4f6' }}>
              <span style={{ fontSize: '16px' }}><strong>1일 평균임금:</strong> (A + B + C) ÷ {calculation.threeMonthDayTotal}일 = </span>
              <strong style={{ fontSize: '20px' }}>{Math.floor(calculation.dailyAverageWage).toLocaleString()} 원</strong>
            </div>
          </div>

          <div style={{ marginTop: '40px', padding: '20px', border: '3px double #000', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '15px' }}>4. 퇴직금 정산 결과</h3>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              평균임금 {Math.floor(calculation.dailyAverageWage).toLocaleString()}원 × 30일 × ({calculation.totalDays}일 / 365)
            </div>
            <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
              최종 퇴직금: {calculation.severancePay.toLocaleString()} 원
            </div>
          </div>

          <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
            <div style={{ textAlign: 'center' }}>
              <p>영수인: ________________ (인)</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p>지급자: {company.name} (인)</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        
        .severance-management label {
          display: block;
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  outline: 'none',
  fontSize: '14px'
};

const printBoxStyle = {
  border: '1px solid #000',
  padding: '15px',
  lineHeight: '1.8'
};

const printLabelStyle = {
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '10px',
  borderBottom: '1px solid #000',
  paddingBottom: '4px'
};

const printTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '10px'
};

const printThStyle = {
  border: '1px solid #000',
  padding: '8px',
  fontSize: '13px'
};

const printTdStyle = {
  border: '1px solid #000',
  padding: '8px',
  fontSize: '13px',
  textAlign: 'right'
};
