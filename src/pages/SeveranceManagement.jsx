import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateProfessionalRetirementTax, applyRounding } from '../utils/retirementTax';
import ApprovalBox from '../components/ApprovalBox';
import { getLeaveDetails } from '../utils/leaveCalculations';
import {
  Printer, Calculator, User, Calendar, ArrowRight,
  CheckCircle, Info, Banknote, Save, History,
  Trash2, Download, ShieldCheck, TrendingUp,
  Plus, Minus, AlertCircle, FileText, Clock
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function SeveranceManagement() {
  const { employees, taxRates, company, leaveRecords } = useAppContext();

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0]);

  // 정산 설정
  const [serviceYearsMode, setServiceYearsMode] = useState('MONTH'); // MONTH or DAY
  const [roundingPolicy, setRoundingPolicy] = useState('FLOOR_10');
  const [isIrpTransfer, setIsIrpTransfer] = useState(false);
  const [isExecutive, setIsExecutive] = useState(false);
  const [executiveLimit, setExecutiveLimit] = useState(0);

  // 급여 내역 (기본 1개 기간)
  const [settlementPeriods, setSettlementPeriods] = useState([
    { id: Date.now(), startDate: '', endDate: '', amount: 0, nonTaxable: 0 }
  ]);

  // 미사용 연차수당 관련 상태
  const [unusedLeaveDays, setUnusedLeaveDays] = useState(0);
  const [dailyOrdinaryWage, setDailyOrdinaryWage] = useState(0);
  const [unusedLeaveAllowance, setUnusedLeaveAllowance] = useState(0);

  const [showAudit, setShowAudit] = useState(false);

  const filteredEmployeesForSearch = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(q) ||
      (emp.workplace && emp.workplace.toLowerCase().includes(q)) ||
      (emp.position && emp.position.toLowerCase().includes(q))
    );
  }, [employees, searchTerm]);

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  // 직원 선택 시 기본 정보 세팅
  useEffect(() => {
    if (selectedEmp) {
      // 1. 예상 퇴직금 자동 계산 (기본급 기준)
      const rawSalary = String(selectedEmp.base_salary || '0').replace(/,/g, '');
      const monthlyWage = Number(rawSalary) || 0;

      const start = new Date(selectedEmp.join_date);
      const end = new Date(resignationDate);
      const totalDays = isNaN(start.getTime()) ? 0 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

      const estimatedAmount = totalDays >= 365 ? Math.floor((monthlyWage * (totalDays / 365)) / 10) * 10 : 0;

      setSettlementPeriods([{
        id: Date.now(),
        startDate: selectedEmp.join_date,
        endDate: resignationDate,
        amount: estimatedAmount,
        nonTaxable: 0
      }]);

      // 2. 미사용 연차수당 자동 계산
      const currentYear = new Date(resignationDate).getFullYear();
      const baseDate = new Date(currentYear, 11, 31);
      const workHours = Number(selectedEmp.work_hours || 8);

      const { totalLeave } = getLeaveDetails(selectedEmp.join_date, baseDate, workHours);
      const used = (leaveRecords || [])
        .filter(r => r.employee_id === selectedEmp.id && new Date(r.leave_date).getFullYear() === currentYear)
        .reduce((sum, r) => sum + Number(r.leave_days), 0);

      const remaining = Math.max(0, totalLeave - used);

      const extraPaysSum = (selectedEmp.extra_pays || []).reduce((sum, p) => sum + Number(String(p.amount).replace(/,/g, '') || 0), 0);
      const totalFixedMonthly = monthlyWage + extraPaysSum;
      const dailyWage = (totalFixedMonthly / (workHours * 6 * 4.345)) * workHours;
      const allowance = Math.floor(remaining * dailyWage);

      setUnusedLeaveDays(remaining);
      setDailyOrdinaryWage(Math.floor(dailyWage));
      setUnusedLeaveAllowance(allowance);

      if (!selectedEmp.has_irp_account) {
        setIsIrpTransfer(false);
      }
    }
  }, [selectedEmpId, resignationDate, leaveRecords]);

  // 실시간 계산 로직 (전체 합산 및 IRP 처리 정교화 + 검증)
  const calculation = useMemo(() => {
    if (!selectedEmp || !resignationDate) return null;

    // [검증] 기간 및 금액 유효성 체크
    for (const p of settlementPeriods) {
      if (!p.startDate || !p.endDate) return { error: '모든 기간의 시작일과 종료일을 입력해주세요.' };
      if (new Date(p.startDate) > new Date(p.endDate)) return { error: '시작일이 종료일보다 늦을 수 없습니다.' };
      if (Number(p.amount) < 0) return { error: '퇴직급여는 0원 이상이어야 합니다.' };
    }

    const totalRawSum = settlementPeriods.reduce((sum, p) => sum + Number(p.amount), 0) + Number(unusedLeaveAllowance);
    const totalRetirementPay = applyRounding(totalRawSum, roundingPolicy);
    const totalNonTaxable = settlementPeriods.reduce((sum, p) => sum + Number(p.nonTaxable), 0);
    let taxableRetirementIncome = totalRetirementPay - totalNonTaxable;

    let excessLaborIncome = 0;
    if (isExecutive && executiveLimit > 0) {
      if (taxableRetirementIncome > executiveLimit) {
        excessLaborIncome = taxableRetirementIncome - executiveLimit;
        taxableRetirementIncome = executiveLimit;
      }
    }

    const allStartDates = settlementPeriods.map(p => p.startDate).filter(Boolean);
    const earliestStart = allStartDates.length > 0 ? allStartDates.sort()[0] : selectedEmp.join_date;

    const result = calculateProfessionalRetirementTax({
      totalRetirementPay: taxableRetirementIncome,
      joinDate: earliestStart,
      resignationDate: resignationDate,
      taxRates: taxRates,
      roundingPolicy: roundingPolicy,
      serviceYearsMode: serviceYearsMode
    });

    const safeIrpTransfer = selectedEmp?.has_irp_account && isIrpTransfer;
    const withholdingTax = safeIrpTransfer ? 0 : result.totalTax;
    const netPay = totalRetirementPay - withholdingTax;

    return {
      ...result,
      totalRetirementPay: totalRetirementPay,
      totalNonTaxable: totalNonTaxable,
      taxableRetirementIncome,
      unusedLeaveAllowance: Number(unusedLeaveAllowance),
      excessLaborIncome,
      netPay,
      actualWithholdingTax: withholdingTax,
      deferredTax: safeIrpTransfer ? result.totalTax : 0,
      isIrpTransfer: !!safeIrpTransfer,
      error: null
    };
  }, [selectedEmp, resignationDate, settlementPeriods, isExecutive, executiveLimit, taxRates, roundingPolicy, isIrpTransfer, serviceYearsMode, unusedLeaveAllowance]);

  const handleSave = async () => {
    if (!calculation || calculation.error) return;

    const calculationHash = `${selectedEmp.id}_${calculation.totalRetirementPay}_${resignationDate}`;

    const payload = {
      employee_id: selectedEmp.id,
      calculation_hash: calculationHash,
      service_years: calculation.serviceYears,
      taxable_amount: calculation.taxableRetirementIncome,
      excess_labor_income: calculation.excessLaborIncome,
      input_json: { settlementPeriods, isExecutive, executiveLimit, isIrpTransfer, serviceYearsMode, roundingPolicy },
      result_json: calculation,
      audit_json: { auditTrail: calculation.auditTrail },
      tax_version: 2024
    };

    const { error } = await supabase.from('retirement_tax_calculations').insert([payload]);
    if (error) {
      if (error.code === '23505') alert('이미 동일한 조건으로 저장된 정산 내역이 존재합니다.');
      else alert('저장 실패: ' + error.message);
    } else {
      alert('정산 내역이 DB에 성공적으로 저장되었습니다.');
    }
  };

  const updatePeriod = (id, field, value) => {
    setSettlementPeriods(settlementPeriods.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  return (
    <div className="severance-management">
      <div className="no-print">
        <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">퇴직금 관리</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}></p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => window.print()} disabled={!calculation || calculation.error}>
              <Printer size={18} /> 인쇄
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!calculation || calculation.error}>
              <Save size={18} /> 결과 저장
            </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          <section className="glass-card">
            <div style={sectionHeaderStyle}><User size={18} className="text-primary" /><h3>대상자 및 정산 기간</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div className="form-group">
                <label>대상 근로자</label>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="직원 이름/부서 검색..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ ...smallInputStyle, background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>
                <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} style={inputStyle}>
                  <option value="">직원 선택 ({filteredEmployeesForSearch.length}명)</option>
                  {filteredEmployeesForSearch.map(emp => (
                    <option key={emp.id} value={emp.id} style={{ background: '#0f172a' }}>
                      {emp.name} {emp.position ? `(${emp.position})` : ''} - {emp.workplace || '부서미지정'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>최종 퇴직일</label>
                <input type="date" value={resignationDate} onChange={e => setResignationDate(e.target.value)} style={inputStyle} />
              </div>
              <div className="form-group">
                <label>근속연수 계산 방식</label>
                <select value={serviceYearsMode} onChange={e => setServiceYearsMode(e.target.value)} style={inputStyle}>
                  <option value="MONTH">월수 기준 (1개월 미만 절사)</option>
                  <option value="DAY">일수 기준 (윤년 반영)</option>
                </select>
              </div>
              <div className="form-group">
                <label>단수 조정</label>
                <select value={roundingPolicy} onChange={e => setRoundingPolicy(e.target.value)} style={inputStyle}>
                  <option value="FLOOR_10">10원 미만 절사</option>
                  <option value="FLOOR_1">1원 미만 절사</option>
                  <option value="FLOOR_100">100원 미만 절사</option>
                </select>
              </div>
            </div>

            <div style={sectionHeaderStyle}><TrendingUp size={18} className="text-primary" /><h3>정산급여 및 비과세 (중간정산 포함)</h3><button onClick={() => setSettlementPeriods([...settlementPeriods, { id: Date.now(), startDate: '', endDate: '', amount: 0, nonTaxable: 0 }])} style={addPeriodBtnStyle}>+ 기간 추가</button></div>
            {settlementPeriods.map((p, idx) => (
              <div key={p.id} style={periodCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#60a5fa' }}>#기간 {idx + 1}</span>
                  {settlementPeriods.length > 1 && <button onClick={() => setSettlementPeriods(settlementPeriods.filter(sp => sp.id !== p.id))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={14} /></button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>시작일</label>
                    <input type="date" value={p.startDate} onChange={e => updatePeriod(p.id, 'startDate', e.target.value)} style={smallInputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>종료일</label>
                    <input type="date" value={p.endDate} onChange={e => updatePeriod(p.id, 'endDate', e.target.value)} style={smallInputStyle} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>총 지급액</label>
                    <div style={{ position: 'relative' }}><input type="text" value={Number(p.amount).toLocaleString()} onChange={e => updatePeriod(p.id, 'amount', Number(e.target.value.replace(/,/g, '')))} style={{ ...smallInputStyle, textAlign: 'right', paddingRight: '25px' }} /><span style={unitStyle}>원</span></div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>비과세액</label>
                    <div style={{ position: 'relative' }}><input type="text" value={Number(p.nonTaxable).toLocaleString()} onChange={e => updatePeriod(p.id, 'nonTaxable', Number(e.target.value.replace(/,/g, '')))} style={{ ...smallInputStyle, textAlign: 'right', paddingRight: '25px' }} /><span style={unitStyle}>원</span></div>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ ...sectionHeaderStyle, marginTop: '24px' }}><Clock size={18} className="text-primary" /><h3>미사용 연차수당 정산</h3></div>
            <div style={optionBoxStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '12px' }}>잔여 연차 개수 (일)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.5"
                      value={unusedLeaveDays}
                      onChange={e => {
                        const rawValue = e.target.value;
                        setUnusedLeaveDays(rawValue);
                        const days = parseFloat(rawValue) || 0;
                        setUnusedLeaveAllowance(Math.floor(days * dailyOrdinaryWage));
                      }}
                      style={{ ...smallInputStyle, paddingRight: '25px' }}
                    />
                    <span style={unitStyle}>일</span>
                  </div>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '12px' }}>최종 지급 수당 (연차수당)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={Number(unusedLeaveAllowance).toLocaleString()}
                      onChange={e => setUnusedLeaveAllowance(Number(e.target.value.replace(/,/g, '')))}
                      style={{ ...smallInputStyle, textAlign: 'right', paddingRight: '25px', fontWeight: 'bold', color: '#10b981' }}
                    />
                    <span style={unitStyle}>원</span>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                * 1일 통상임금 추정액: <strong>{dailyOrdinaryWage.toLocaleString()}원</strong> (기본급+제수당 기준)
              </p>
            </div>

            <div style={{ ...sectionHeaderStyle, marginTop: '24px' }}><ShieldCheck size={18} className="text-primary" /><h3>임원 및 IRP 설정</h3></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={optionBoxStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}><input type="checkbox" id="is_exec" checked={isExecutive} onChange={e => setIsExecutive(e.target.checked)} /><label htmlFor="is_exec" style={{ fontWeight: '600' }}>임원 여부</label></div>
                {isExecutive && <div className="form-group"><label style={{ fontSize: '11px' }}>퇴직소득 한도액</label><input type="text" value={executiveLimit.toLocaleString()} onChange={e => setExecutiveLimit(Number(e.target.value.replace(/,/g, '')))} style={{ ...smallInputStyle, textAlign: 'right' }} /></div>}
              </div>
              <div style={{ ...optionBoxStyle, borderColor: selectedEmp?.has_irp_account ? 'rgba(96, 165, 250, 0.3)' : 'rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><input type="checkbox" id="irp" disabled={!selectedEmp?.has_irp_account} checked={isIrpTransfer} onChange={e => setIsIrpTransfer(e.target.checked)} /><label htmlFor="irp" style={{ fontWeight: '600', opacity: selectedEmp?.has_irp_account ? 1 : 0.5 }}>IRP 전액 이체</label></div>
                {!selectedEmp?.has_irp_account ? <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#f87171', fontSize: '11px', background: 'rgba(248,113,113,0.1)', padding: '6px', borderRadius: '4px' }}><AlertCircle size={12} /><span>IRP 미가입: 기능을 사용할 수 없습니다.</span></div> : <p style={{ fontSize: '11px', color: '#60a5fa' }}>{selectedEmp.irp_provider} ({selectedEmp.irp_account_number})</p>}
              </div>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="glass-card" style={{ flex: 1 }}>
              <div style={sectionHeaderStyle}><Calculator size={18} className="text-primary" /><h3>정산 결과 요약</h3><button onClick={() => setShowAudit(!showAudit)} style={auditBtnStyle}>{showAudit ? '요약 보기' : '계산 상세(Audit) 보기'}</button></div>
              {!calculation ? <div style={emptyResultStyle}>직원을 선택해 주세요.</div> : calculation.error ? <div style={{ ...emptyResultStyle, color: '#f87171', flexDirection: 'column', gap: '12px' }}><AlertCircle size={40} /><span>{calculation.error}</span></div> : showAudit ? (
                <div style={auditContainerStyle}><h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#60a5fa' }}>국세청 표준 산식 추적 (Audit Trail)</h4>{calculation.auditTrail.map((line, i) => (<div key={i} style={{ fontSize: '13px', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6', borderLeft: '3px solid #60a5fa' }}>{line}</div>))}</div>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ ...summaryRowStyle, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '16px' }}><span style={{ color: '#93c5fd' }}>확정 근속연수</span><strong style={{ fontSize: '18px', color: '#93c5fd' }}>{calculation.serviceYears} 년</strong></div>
                  <div style={summaryRowStyle}><span>총 퇴직급여</span><strong>{calculation.totalRetirementPay.toLocaleString()} 원</strong></div>
                  <div style={{ ...summaryRowStyle, fontSize: '13px', color: '#10b981' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> 미사용 연차수당</span>
                    <span>{calculation.unusedLeaveAllowance.toLocaleString()} 원</span>
                  </div>
                  {calculation.totalNonTaxable > 0 && <div style={summaryRowStyle}><span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>└ 비과세액</span><span style={{ fontSize: '13px' }}>- {calculation.totalNonTaxable.toLocaleString()} 원</span></div>}
                  {calculation.excessLaborIncome > 0 && <div style={summaryRowStyle}><span style={{ fontSize: '13px', color: '#fbbf24' }}>└ 임원 한도초과 (근로소득)</span><span style={{ fontSize: '13px', color: '#fbbf24' }}>{calculation.excessLaborIncome.toLocaleString()} 원</span></div>}
                  <div style={{ margin: '20px 0', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--text-secondary)' }}>퇴직소득세 (국세)</span><span>{calculation.incomeTax.toLocaleString()} 원</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--text-secondary)' }}>지방소득세 (10%)</span><span>{calculation.residentTax.toLocaleString()} 원</span></div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}><span>세액 합계</span><span style={{ color: '#f87171' }}>{calculation.totalTax.toLocaleString()} 원</span></div>
                  </div>
                  <div style={resultHighlightStyle}><div style={{ fontSize: '14px', color: '#93c5fd', marginBottom: '4px' }}>{calculation.isIrpTransfer ? 'IRP 이체액 (과세이연)' : '실수령액 (원천징수 후)'}</div><div style={{ fontSize: '32px', fontWeight: 'bold' }}>{calculation.netPay.toLocaleString()} <span style={{ fontSize: '18px' }}>원</span></div>{calculation.isIrpTransfer && <div style={{ fontSize: '12px', color: '#34d399', marginTop: '8px' }}>* IRP 계좌로 전액 이체되어 실 원천징수 세액은 0원입니다.</div>}</div>
                </div>
              )}
            </div>
            <div className="glass-card" style={{ background: 'rgba(96, 165, 250, 0.05)', border: '1px solid rgba(96, 165, 250, 0.2)' }}><div style={{ display: 'flex', gap: '12px' }}><Info size={24} style={{ color: '#60a5fa' }} /><div><h4 style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '4px' }}>정산 가이드</h4><p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>본 시스템은 2024년 최신 개정 세법을 반영합니다. 산출 결과 옆의 'Audit 보기'를 통해 단계별 환산 산식을 국세청 홈택스 결과와 대조해 보실 수 있습니다.</p></div></div></div>
          </section>
        </div>
      </div>

      {calculation && !calculation.error && (
        <div className="print-only" style={printReportStyle}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <ApprovalBox />
          </div>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', textDecoration: 'underline' }}>퇴직금 산정 내역서</h1>
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginBottom: '30px' }}>(NTS 국세청 표준 산식 적용)</p>

          <div style={{ textAlign: 'right', marginBottom: '10px' }}>출력일: {new Date().toLocaleDateString()}</div>

          <table style={printTableStyle}>
            <tbody>
              <tr><th style={printThStyle}>소속</th><td style={printTdStyle}>{selectedEmp?.workplace}</td><th style={printThStyle}>직위</th><td style={printTdStyle}>{selectedEmp?.position || '-'}</td></tr>
              <tr><th style={printThStyle}>성명</th><td style={printTdStyle}>{selectedEmp?.name}</td><th style={printThStyle}>사번</th><td style={printTdStyle}>{selectedEmp?.employee_id || '-'}</td></tr>
              <tr><th style={printThStyle}>입사일</th><td style={printTdStyle}>{selectedEmp?.join_date}</td><th style={printThStyle}>퇴사일</th><td style={printTdStyle}>{resignationDate}</td></tr>
              <tr><th style={printThStyle}>근속연수</th><td style={printTdStyle} colSpan="3">{calculation.serviceYears}년 (산정방식: {serviceYearsMode === 'MONTH' ? '월수 기준' : '일수 기준'})</td></tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '30px', fontSize: '16px', borderLeft: '4px solid #000', paddingLeft: '10px' }}>1. 퇴직급여 지급 상세</h3>
          <table style={printTableStyle}>
            <thead>
              <tr>
                <th style={printThStyle}>구분</th>
                <th style={printThStyle}>기간</th>
                <th style={printThStyle}>총 지급액</th>
                <th style={printThStyle}>비과세액</th>
              </tr>
            </thead>
            <tbody>
              {settlementPeriods.map((p, i) => (
                <tr key={i}>
                  <td style={printTdStyle}>기간 {i + 1}</td>
                  <td style={printTdStyle}>{p.startDate} ~ {p.endDate}</td>
                  <td style={printTdStyle}>{Number(p.amount).toLocaleString()}원</td>
                  <td style={printTdStyle}>{Number(p.nonTaxable).toLocaleString()}원</td>
                </tr>
              ))}
              <tr>
                <td style={printTdStyle}>기타</td>
                <td style={printTdStyle}>미사용 연차수당 정산 (n/a)</td>
                <td style={printTdStyle}>{calculation.unusedLeaveAllowance.toLocaleString()}원</td>
                <td style={printTdStyle}>0원</td>
              </tr>
              <tr style={{ fontWeight: 'bold', background: '#f9f9f9' }}>
                <td style={printTdStyle} colSpan="2">합계</td>
                <td style={printTdStyle}>{calculation.totalRetirementPay.toLocaleString()}원</td>
                <td style={printTdStyle}>{calculation.totalNonTaxable.toLocaleString()}원</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ marginTop: '30px', fontSize: '16px', borderLeft: '4px solid #000', paddingLeft: '10px' }}>2. 세액 산출 및 차감 내역</h3>
          <table style={printTableStyle}>
            <tbody>
              <tr>
                <td style={{ ...printTdStyle, textAlign: 'left', background: '#f5f5f5', width: '40%' }}>퇴직소득금액 (한도 내)</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{calculation.taxableRetirementIncome.toLocaleString()}원</td>
              </tr>
              {calculation.excessLaborIncome > 0 && (
                <tr>
                  <td style={{ ...printTdStyle, textAlign: 'left', color: '#d97706' }}>임원 퇴직금 한도초과액 (근로소득)</td>
                  <td style={{ ...printTdStyle, textAlign: 'right', color: '#d97706' }}>{calculation.excessLaborIncome.toLocaleString()}원</td>
                </tr>
              )}
              <tr>
                <td style={{ ...printTdStyle, textAlign: 'left' }}>근속연수 공제</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>- {calculation.serviceYearDeduction.toLocaleString()}원</td>
              </tr>
              <tr>
                <td style={{ ...printTdStyle, textAlign: 'left' }}>퇴직소득세 (국세)</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{calculation.incomeTax.toLocaleString()}원</td>
              </tr>
              <tr>
                <td style={{ ...printTdStyle, textAlign: 'left' }}>지방소득세 (10%)</td>
                <td style={{ ...printTdStyle, textAlign: 'right' }}>{calculation.residentTax.toLocaleString()}원</td>
              </tr>
              <tr style={{ fontWeight: 'bold', fontSize: '16px' }}>
                <td style={{ ...printTdStyle, textAlign: 'left', background: '#eee' }}>차감지급액 (실수령액)</td>
                <td style={{ ...printTdStyle, textAlign: 'right', background: '#eee' }}>
                  {calculation.netPay.toLocaleString()}원
                </td>
              </tr>
            </tbody>
          </table>

          {calculation.isIrpTransfer && (
            <div style={{ marginTop: '15px', padding: '15px', border: '1px solid #000', background: '#f9f9f9' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>※ IRP(개인형 퇴직연금) 과세이연 안내</p>
              <p style={{ fontSize: '13px', lineHeight: '1.4' }}>
                본 퇴직급여는 IRP 계좌로 전액 이체됨에 따라 퇴직소득세의 원천징수가 유예(이연)되었습니다.<br />
                - 이체기관: {selectedEmp.irp_provider}<br />
                - 계좌번호: {selectedEmp.irp_account_number}<br />
                - 이연세액: {calculation.totalTax.toLocaleString()}원
              </p>
            </div>
          )}

          <div style={{ marginTop: '80px', textAlign: 'center' }}>
            <p style={{ fontSize: '16px' }}>위 금액을 퇴직소득 정산금으로 정히 영수함</p>
            <p style={{ marginTop: '40px' }}>202__년 __월 __일</p>
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '50px', fontSize: '18px' }}>
              <span>성명 : {selectedEmp.name} (인)</span>
            </div>
            <div style={{ marginTop: '80px', fontSize: '26px', fontWeight: 'bold', position: 'relative', display: 'inline-block' }}>
              {company?.name || '(주)회사'}
              {company?.seal_url && (
                <img 
                  src={company.seal_url} 
                  alt="직인" 
                  style={{ 
                    position: 'absolute', 
                    right: '-60px', 
                    top: '-30px', 
                    width: '80px', 
                    height: '80px', 
                    objectFit: 'contain',
                    opacity: 0.8
                  }} 
                />
              )}
               귀하
            </div>
          </div>
        </div>
      )}

      <style>{`
        .severance-management h3 { font-size: 16px; margin: 0; }
        .form-group label { display: block; font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

const sectionHeaderStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '14px' };
const smallInputStyle = { ...inputStyle, padding: '8px 10px', fontSize: '13px' };
const addPeriodBtnStyle = { marginLeft: 'auto', padding: '4px 10px', fontSize: '12px', background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', border: '1px solid #60a5fa', borderRadius: '6px', cursor: 'pointer' };
const periodCardStyle = { background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' };
const unitStyle = { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-secondary)' };
const optionBoxStyle = { background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' };
const auditBtnStyle = { marginLeft: 'auto', padding: '4px 8px', fontSize: '11px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' };
const emptyResultStyle = { height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' };
const summaryRowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' };
const resultHighlightStyle = { background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)', padding: '24px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)', marginTop: '20px' };
const auditContainerStyle = { background: '#000', padding: '16px', borderRadius: '8px', maxHeight: '400px', overflowY: 'auto', color: '#34d399', fontFamily: 'monospace' };
const printReportStyle = { padding: '40px', color: '#000', background: '#fff' };
const printTableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px' };
const printThStyle = { border: '1px solid #000', padding: '10px', background: '#f5f5f5', textAlign: 'center', fontSize: '14px' };
const printTdStyle = { border: '1px solid #000', padding: '10px', textAlign: 'center', fontSize: '14px' };
