import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateRetirementTax } from '../utils/retirementTax';
import { 
  Printer, Calculator, User, Calendar, ArrowRight, 
  CheckCircle, Info, Banknote, Save, History, 
  Trash2, Download, ShieldCheck, TrendingUp
} from 'lucide-react';

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
  const [bonusTotal, setBonusTotal] = useState(0);
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState(0);
  
  // 저장된 이력 관리 (localStorage 시뮬레이션)
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('severance_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistory, setShowHistory] = useState(false);

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  // 직원 선택 시 최근 3개월 데이터 자동 로드
  useEffect(() => {
    if (selectedEmp) {
      const resDate = new Date(resignationDate);
      const newWages = [];
      
      for (let i = 1; i <= 3; i++) {
        const d = new Date(resDate.getFullYear(), resDate.getMonth() - i + 1, 0);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const archive = payrollArchives.find(a => a.year === d.getFullYear() && a.month === d.getMonth() + 1);
        const empData = archive?.data.find(d => d.emp.id === selectedEmp.id);
        
        newWages.push({
          month: monthStr,
          days: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
          amount: empData ? empData.taxableTotal : (Number(selectedEmp.base_salary) || 0)
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
    
    const bonusPortion = (Number(bonusTotal) * 3) / 12;
    const annualLeavePortion = (Number(annualLeaveAllowance) * 3) / 12;

    const dailyAverageWage = (threeMonthWageTotal + bonusPortion + annualLeavePortion) / threeMonthDayTotal;
    const preTaxSeverancePay = Math.floor(((dailyAverageWage * 30) * (totalDays / 365)) / 10) * 10;

    // 세금 계산 모듈 호출
    const taxInfo = calculateRetirementTax(preTaxSeverancePay, selectedEmp.join_date, resignationDate);

    return {
      totalDays,
      isEligible,
      threeMonthWageTotal,
      threeMonthDayTotal,
      bonusPortion,
      annualLeavePortion,
      dailyAverageWage,
      preTaxSeverancePay,
      ...taxInfo
    };
  }, [selectedEmp, resignationDate, manualWages, bonusTotal, annualLeaveAllowance]);

  const handleSave = () => {
    if (!calculation || calculation.error) return;
    
    const newEntry = {
      id: Date.now(),
      empName: selectedEmp.name,
      empId: selectedEmp.id,
      resignationDate,
      totalDays: calculation.totalDays,
      preTax: calculation.preTaxSeverancePay,
      tax: calculation.totalTax,
      net: calculation.netSeverancePay,
      createdAt: new Date().toISOString()
    };
    
    const updatedHistory = [newEntry, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('severance_history', JSON.stringify(updatedHistory));
    alert('정산 내역이 저장되었습니다.');
  };

  const deleteHistory = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem('severance_history', JSON.stringify(updated));
  };

  const handlePrint = () => window.print();

  return (
    <div className="severance-management">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Banknote size={32} style={{ color: '#60a5fa' }} /> 퇴직금 정산 및 소득세 관리
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>2024년 개정 세법이 적용된 퇴직소득세 자동 계산 시스템</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => setShowHistory(!showHistory)}>
              <History size={18} style={{ marginRight: '8px' }} /> {showHistory ? '정산 화면으로' : '정산 이력 보기'}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!calculation || !calculation.isEligible}>
              <Save size={18} style={{ marginRight: '8px' }} /> 정산 결과 저장
            </button>
            <button className="btn btn-outline" onClick={handlePrint} disabled={!calculation || calculation.error}>
              <Printer size={18} style={{ marginRight: '8px' }} /> 내역서 인쇄
            </button>
          </div>
        </div>

        {showHistory ? (
          <div className="glass-card" style={{ animation: 'fadeIn 0.4s ease' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} className="text-primary" /> 퇴직금 정산 기록
            </h3>
            <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  <th style={{ padding: '12px' }}>정산일</th>
                  <th style={{ padding: '12px' }}>근로자</th>
                  <th style={{ padding: '12px' }}>퇴사일</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>퇴직급여(세전)</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>퇴직소득세</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>실수령액</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                    <td style={{ padding: '12px' }}>{new Date(h.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{h.empName}</td>
                    <td style={{ padding: '12px' }}>{h.resignationDate}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{h.preTax.toLocaleString()}원</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#f87171' }}>{h.tax.toLocaleString()}원</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#60a5fa', fontWeight: '600' }}>{h.net.toLocaleString()}원</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button onClick={() => deleteHistory(h.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>저장된 정산 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
            {/* 왼쪽: 입력 섹션 */}
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <User size={20} className="text-primary" />
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>기초 정보 및 급여 입력</h3>
              </div>
              
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>대상 근로자</label>
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
                      <label>입사일</label>
                      <input type="date" value={selectedEmp.join_date} readOnly style={{ ...inputStyle, opacity: 0.6 }} />
                    </div>
                    <div className="form-group">
                      <label>퇴직(예정)일</label>
                      <input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={16} /> 최근 3개월 급여 (세전)
                    </h4>
                    {manualWages.map((w, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 160px', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{w.month}</div>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={w.days} 
                            onChange={e => {
                              const newW = [...manualWages];
                              newW[idx].days = Number(e.target.value);
                              setManualWages(newW);
                            }}
                            style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-secondary)' }}>일</span>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            value={w.amount.toLocaleString()} 
                            onChange={e => {
                              const newW = [...manualWages];
                              newW[idx].amount = Number(e.target.value.replace(/,/g, ''));
                              setManualWages(newW);
                            }}
                            style={{ ...inputStyle, padding: '8px', textAlign: 'right', paddingRight: '30px' }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-secondary)' }}>원</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>연간 상여금 총액</label>
                      <input 
                        type="text" 
                        value={bonusTotal.toLocaleString()} 
                        onChange={e => setBonusTotal(Number(e.target.value.replace(/,/g, '')))}
                        style={{ ...inputStyle, textAlign: 'right' }}
                      />
                    </div>
                    <div className="form-group">
                      <label>미사용 연차수당</label>
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

            {/* 오른쪽: 결과 및 세금 섹션 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <Calculator size={20} className="text-primary" />
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>산출 결과 요약</h3>
                </div>
                
                {!selectedEmp ? (
                  <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Calculator size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p>직원을 선택하면 정산 결과가 표시됩니다.</p>
                  </div>
                ) : calculation?.error ? (
                  <div className="alert alert-error">{calculation.error}</div>
                ) : (
                  <div style={{ animation: 'slideInRight 0.3s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>재직일수</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{calculation.totalDays.toLocaleString()} <span style={{ fontSize: '14px' }}>일</span></div>
                        <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>근속연수: {calculation.serviceYears}년</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>1일 평균임금</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{Math.floor(calculation.dailyAverageWage).toLocaleString()} <span style={{ fontSize: '14px' }}>원</span></div>
                        <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '4px' }}>통상임금 기준 정산</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>퇴직급여 총액 (세전)</span>
                        <strong style={{ fontSize: '20px', color: '#f3f4f6' }}>{calculation.preTaxSeverancePay.toLocaleString()} 원</strong>
                      </div>
                      
                      <div style={{ background: 'rgba(248, 113, 113, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(248, 113, 113, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                          <span style={{ color: '#f87171' }}>퇴직소득세</span>
                          <span>- {calculation.incomeTax.toLocaleString()} 원</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                          <span style={{ color: '#f87171' }}>지방소득세 (10%)</span>
                          <span>- {calculation.residentTax.toLocaleString()} 원</span>
                        </div>
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed rgba(248, 113, 113, 0.2)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>공제 총액</span>
                          <span style={{ color: '#f87171' }}>{calculation.totalTax.toLocaleString()} 원</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                      <div style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '8px' }}>최종 예상 실수령액</div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff' }}>
                        {calculation.netSeverancePay.toLocaleString()} <span style={{ fontSize: '20px' }}>원</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {calculation && calculation.isEligible && (
                <div className="glass-card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <ShieldCheck className="text-success" size={24} />
                    <div>
                      <h4 style={{ fontWeight: '600', color: '#34d399', marginBottom: '4px' }}>법정 퇴직금 지급 대상</h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        해당 근로자는 계속근로기간이 1년 이상이므로 법정 퇴직금 지급 대상에 해당합니다. 
                        평균임금 산정 시 연간 상여금과 연차수당의 3/12이 정확히 산입되었습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 인쇄 레이아웃 (기존보다 강화됨) */}
      {selectedEmp && calculation && !calculation.error && (
        <div className="print-only" style={{ color: '#000', padding: '40px', background: '#fff', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '10px' }}>퇴직금 정산 상세 내역서</h1>
            <p style={{ fontSize: '14px' }}>Retirement Pay Settlement Statement</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div style={printBoxStyle}>
              <h4 style={printLabelStyle}>1. 근로자 인적사항</h4>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr><td style={{ width: '80px', padding: '4px' }}>성 명 :</td><td>{selectedEmp.name}</td></tr>
                  <tr><td style={{ padding: '4px' }}>입사일 :</td><td>{selectedEmp.join_date}</td></tr>
                  <tr><td style={{ padding: '4px' }}>퇴사일 :</td><td>{resignationDate}</td></tr>
                  <tr><td style={{ padding: '4px' }}>재직일수 :</td><td>{calculation.totalDays} 일 (약 {calculation.serviceYears}년)</td></tr>
                </tbody>
              </table>
            </div>
            <div style={printBoxStyle}>
              <h4 style={printLabelStyle}>2. 사업장 정보</h4>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <tbody>
                  <tr><td style={{ width: '80px', padding: '4px' }}>법인명 :</td><td>{company.name}</td></tr>
                  <tr><td style={{ padding: '4px' }}>대표자 :</td><td>(인)</td></tr>
                  <tr><td style={{ padding: '4px' }}>정산일 :</td><td>{new Date().toLocaleDateString()}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 style={printLabelStyle}>3. 평균임금 산정 상세 (최근 3개월)</h4>
            <table style={printTableStyle}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={printThStyle}>산정 기간</th>
                  <th style={printThStyle}>기간일수</th>
                  <th style={printThStyle}>기본급 및 제수당</th>
                </tr>
              </thead>
              <tbody>
                {manualWages.map((w, idx) => (
                  <tr key={idx}>
                    <td style={{ ...printTdStyle, textAlign: 'center' }}>{w.month}</td>
                    <td style={{ ...printTdStyle, textAlign: 'center' }}>{w.days} 일</td>
                    <td style={printTdStyle}>{w.amount.toLocaleString()} 원</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#f8f9fa' }}>
                  <td style={{ ...printTdStyle, textAlign: 'center' }}>합 계 (A)</td>
                  <td style={{ ...printTdStyle, textAlign: 'center' }}>{calculation.threeMonthDayTotal} 일</td>
                  <td style={printTdStyle}>{calculation.threeMonthWageTotal.toLocaleString()} 원</td>
                </tr>
              </tbody>
            </table>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              <div style={{ border: '1px solid #000', padding: '10px', fontSize: '12px' }}>
                <strong>상여금 가산액 (B):</strong> {calculation.bonusPortion.toLocaleString()} 원<br/>
                (연간 상여 {bonusTotal.toLocaleString()}원 × 3/12)
              </div>
              <div style={{ border: '1px solid #000', padding: '10px', fontSize: '12px' }}>
                <strong>연차수당 가산액 (C):</strong> {calculation.annualLeavePortion.toLocaleString()} 원<br/>
                (최근 1년 연차수당 {annualLeaveAllowance.toLocaleString()}원 × 3/12)
              </div>
            </div>
            
            <div style={{ marginTop: '15px', padding: '15px', border: '2px solid #000', textAlign: 'center', background: '#f8f9fa' }}>
              <span style={{ fontSize: '14px' }}>1일 평균임금 = (A + B + C) / {calculation.threeMonthDayTotal}일 = </span>
              <strong style={{ fontSize: '18px' }}>{Math.floor(calculation.dailyAverageWage).toLocaleString()} 원</strong>
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <h4 style={printLabelStyle}>4. 퇴직금 및 세금 정산 결과</h4>
            <table style={printTableStyle}>
              <tbody>
                <tr>
                  <td style={{ ...printTdStyle, textAlign: 'left', width: '250px' }}>① 퇴직급여 총액 (세전)</td>
                  <td style={printTdStyle}><strong>{calculation.preTaxSeverancePay.toLocaleString()} 원</strong></td>
                </tr>
                <tr>
                  <td style={{ ...printTdStyle, textAlign: 'left' }}>② 퇴직소득세</td>
                  <td style={printTdStyle}>- {calculation.incomeTax.toLocaleString()} 원</td>
                </tr>
                <tr>
                  <td style={{ ...printTdStyle, textAlign: 'left' }}>③ 지방소득세</td>
                  <td style={printTdStyle}>- {calculation.residentTax.toLocaleString()} 원</td>
                </tr>
                <tr style={{ background: '#f8f9fa', fontSize: '18px' }}>
                  <td style={{ ...printTdStyle, textAlign: 'left' }}><strong>④ 차감지급액 (실수령액)</strong></td>
                  <td style={printTdStyle}><strong>{calculation.netSeverancePay.toLocaleString()} 원</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '100px', display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '40px' }}>위 정산 금액을 정히 영수함</p>
              <p>202__년 __월 __일</p>
              <p style={{ marginTop: '20px', fontSize: '18px' }}>성명: ________________ (인)</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '60px' }}>사업주 귀하</p>
              <p style={{ fontSize: '18px' }}>{company.name}</p>
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
          margin-bottom: 8px;
          font-weight: 500;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; }
        }
        
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  outline: 'none',
  fontSize: '14px',
  transition: 'all 0.2s ease'
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
  padding: '10px',
  fontSize: '13px',
  textAlign: 'center'
};

const printTdStyle = {
  border: '1px solid #000',
  padding: '10px',
  fontSize: '13px',
  textAlign: 'right'
};
