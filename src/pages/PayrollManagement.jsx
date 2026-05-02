import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll, recalculateDeductions } from '../utils/payrollCalculations';
import { Printer, CheckCircle, Calendar, Plus, X, Copy } from 'lucide-react';

export default function PayrollManagement() {
  const { company, employees, insuranceRates, payrollArchives, saveArchive, removeArchive } = useAppContext();

  const today = new Date();
  const [targetYear, setTargetYear] = useState(today.getFullYear());
  const [targetMonth, setTargetMonth] = useState(today.getMonth() + 1);
  const [selectedEmpIdState, setSelectedEmpIdState] = useState(null);
  const [filterWorkplace, setFilterWorkplace] = useState('all');
  const [isSummaryMode, setIsSummaryMode] = useState(false);

  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedDate, setFinalizedDate] = useState(null);

  const currentMonthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  // 1. 계산된 원본 데이터를 편집 가능한 Draft 형태로 변환
  const initializeDraft = () => {
    const validEmployees = employees.filter(emp => {
      if (emp.resignation_date) {
        const resDate = new Date(emp.resignation_date);
        const currentTarget = new Date(targetYear, targetMonth - 1, 1);
        if (resDate < currentTarget) return false;
      }
      return true;
    });

    return validEmployees.map(emp => {
      const p = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
      return {
        emp,
        earnings: [
          { id: 'base', name: '기본급', amount: p.basePay, isFixed: true, isTaxFree: false },
          ...p.extraPays.map((ep, i) => ({ id: `ep_${i}`, name: ep.name, amount: ep.amount, isTaxFree: !!ep.isTaxFree }))
        ],
        deductions: [
          { id: 'np', name: '국민연금', amount: p.nationalPension },
          { id: 'hi', name: '건강보험', amount: p.healthInsurance },
          { id: 'ltc', name: '장기요양보험', amount: p.longTermCare },
          { id: 'ei', name: '고용보험', amount: p.employmentInsurance },
          { id: 'it', name: '소득세', amount: p.incomeTax },
          { id: 'rt', name: '지방소득세', amount: p.residentTax }
        ], // 0원인 항목도 편집을 위해 유지
        calculationMethod: p.calculationMethod,
        remarks: ''
      };
    });
  };

  const [payrollDraft, setPayrollDraft] = useState([]);

  // 기준 월이나 직원 정보 변경 시 Draft 초기화 또는 마감본 불러오기
  useEffect(() => {
    const archive = payrollArchives.find(p => p.year === targetYear && p.month === targetMonth);
    if (archive) {
      // 마감된 내역이 있을 경우 로드 (새로고침해도 유지됨)
      setPayrollDraft(archive.data);
      setIsFinalized(true);
      setFinalizedDate(new Date(archive.finalizedAt).toLocaleString());
    } else {
      // 마감 내역이 없으면 동적으로 초기화
      setPayrollDraft(initializeDraft());
      setIsFinalized(false);
      setFinalizedDate(null);
    }
  }, [employees, company, insuranceRates, currentMonthStr, targetYear, targetMonth, payrollArchives]);

  // 2. Draft 데이터를 기반으로 총액 계산
  const currentData = useMemo(() => {
    return payrollDraft.map(item => {
      const taxableTotal = item.earnings
        .filter(e => !e.isTaxFree)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const nonTaxableTotal = item.earnings
        .filter(e => e.isTaxFree)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const totalDeductions = item.deductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

      return {
        ...item,
        taxableTotal,
        nonTaxableTotal,
        totalGrossPay: taxableTotal + nonTaxableTotal,
        totalDeductions,
        netPay: (taxableTotal + nonTaxableTotal) - totalDeductions
      };
    });
  }, [payrollDraft]);

  const workplaceList = [...new Set(employees.map(e => e.workplace).filter(Boolean))];

  const filteredCurrentData = useMemo(() => {
    return currentData.filter(d => filterWorkplace === 'all' || (d.emp.workplace || '') === filterWorkplace);
  }, [currentData, filterWorkplace]);

  const workplaceSummaries = useMemo(() => {
    const groups = {};
    const sourceData = filterWorkplace === 'all' ? currentData : filteredCurrentData;

    sourceData.forEach(data => {
      const wp = data.emp.workplace || '부서미지정';
      if (!groups[wp]) {
        groups[wp] = {
          name: wp,
          basePay: 0,
          extraSum: 0,
          taxableTotal: 0,
          np: 0,
          hi: 0,
          ltc: 0,
          ei: 0,
          it: 0,
          rt: 0,
          totalDeductions: 0,
          netPay: 0,
          count: 0
        };
      }
      const basePay = data.earnings.find(e => e.id === 'base')?.amount || 0;
      groups[wp].basePay += basePay;
      groups[wp].extraSum += (data.taxableTotal - basePay);
      groups[wp].taxableTotal += data.taxableTotal;
      groups[wp].np += data.deductions.find(d => d.id === 'np')?.amount || 0;
      groups[wp].hi += data.deductions.find(d => d.id === 'hi')?.amount || 0;
      groups[wp].ltc += data.deductions.find(d => d.id === 'ltc')?.amount || 0;
      groups[wp].ei += data.deductions.find(d => d.id === 'ei')?.amount || 0;
      groups[wp].it += data.deductions.find(d => d.id === 'it')?.amount || 0;
      groups[wp].rt += data.deductions.find(d => d.id === 'rt')?.amount || 0;
      groups[wp].totalDeductions += data.totalDeductions;
      groups[wp].netPay += data.netPay;
      groups[wp].count += 1;
    });
    return Object.values(groups);
  }, [currentData, filteredCurrentData, filterWorkplace]);

  const selectedEmpId = selectedEmpIdState || (filteredCurrentData.length > 0 ? filteredCurrentData[0].emp.id : null);
  const selectedData = currentData.find(d => d.emp.id === selectedEmpId);

  // 방향키 네비게이션
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const currentIndex = currentData.findIndex(d => d.emp.id === selectedEmpId);
        if (currentIndex !== -1) {
          e.preventDefault();
          let nextIndex = currentIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = Math.min(currentIndex + 1, currentData.length - 1);
          } else {
            nextIndex = Math.max(currentIndex - 1, 0);
          }
          setSelectedEmpIdState(currentData[nextIndex].emp.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentData, selectedEmpId]);

  const handlePrint = () => window.print();

  const handleFinalize = () => {
    if (isFinalized) {
      const confirmRe = window.confirm(`이미 ${targetYear}년 ${targetMonth}월 급여가 마감되어 있습니다.\n지금 화면의 수동 편집 데이터로 덮어쓰시겠습니까?`);
      if (!confirmRe) return;
    } else {
      const confirmFinalize = window.confirm(`${targetYear}년 ${targetMonth}월 급여를 마감하시겠습니까?\n마감된 데이터는 브라우저를 껐다 켜도 영구 유지됩니다.`);
      if (!confirmFinalize) return;
    }
    saveArchive(targetYear, targetMonth, currentData);
    alert("급여가 성공적으로 마감 및 로컬에 안전하게 저장되었습니다!");
  };

  const handleUnfinalize = () => {
    const confirmUnfinalize = window.confirm(`마감을 취소하시겠습니까?\n\n주의: 마감을 취소하면 현재 저장된 화면 정보가 날아가고, [임직원 관리]의 최신 계정 정보(기본급, 부양가족 수 등)를 바탕으로 급여가 새롭게 "초기화(재계산)" 됩니다.`);
    if (confirmUnfinalize) {
      removeArchive(targetYear, targetMonth);
      window.location.reload();
    }
  };

  // 전월 데이터 복사
  const handleCopyPrevMonth = () => {
    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
    const prevArchive = payrollArchives.find(p => p.year === prevYear && p.month === prevMonth);

    if (!prevArchive) {
      alert(`${prevYear}년 ${prevMonth}월 마감 데이터가 없습니다.\n전월 급여를 먼저 마감해주세요.`);
      return;
    }

    const confirmCopy = window.confirm(
      `${prevYear}년 ${prevMonth}월 마감 데이터를 ${targetYear}년 ${targetMonth}월로 복사합니다.\n\n복사 후 각 직원의 보너스, 수당 등을 수정하신 뒤 마감하시면 됩니다.\n\n현재 화면의 데이터가 덮어쓰여집니다. 계속하시겠습니까?`
    );
    if (!confirmCopy) return;

    // 전월 데이터를 깊은 복사하여 현재 월로 적용
    const copiedData = prevArchive.data.map(item => ({
      ...item,
      earnings: item.earnings.map(e => ({ ...e })),
      deductions: item.deductions.map(d => ({ ...d }))
    }));

    setPayrollDraft(copiedData);
    setIsFinalized(false);
    setFinalizedDate(null);
    alert(`${prevYear}년 ${prevMonth}월 데이터가 성공적으로 복사되었습니다!\n필요한 항목을 수정한 후 급여 마감을 진행해주세요.`);
  };

  // 전월 마감 존재 여부 채크
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const hasPrevArchive = payrollArchives.some(p => p.year === prevYear && p.month === prevMonth);

  const standardDeductionIds = ['np', 'hi', 'ltc', 'ei', 'it', 'rt'];
  const standardDeductionNames = {
    np: '국민연금', hi: '건강보험', ltc: '장기요양보험',
    ei: '고용보험', it: '소득세', rt: '지방소득세'
  };

  const updateRemarks = (empId, value) => {
    setPayrollDraft(prev => prev.map(draft =>
      draft.emp.id === empId ? { ...draft, remarks: value } : draft
    ));
  };

  const updateDraft = (empId, type, id, field, value) => {
    setPayrollDraft(prev => prev.map(draft => {
      if (draft.emp.id !== empId) return draft;

      const newDraft = {
        ...draft,
        [type]: draft[type].map(item => item.id === id ? { ...item, [field]: value } : item)
      };

      if (type === 'earnings') {
        const taxableTotal = newDraft.earnings
          .filter(e => !e.isTaxFree)
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const autoDeductions = recalculateDeductions({
          taxableTotal,
          employee: draft.emp,
          rates: insuranceRates,
          paymentMonth: currentMonthStr
        });

        const updatedDeductions = [...newDraft.deductions];
        standardDeductionIds.forEach(sid => {
          const idx = updatedDeductions.findIndex(d => d.id === sid);
          if (idx !== -1) {
            updatedDeductions[idx] = { ...updatedDeductions[idx], amount: autoDeductions[sid] };
          } else if (autoDeductions[sid] > 0) {
            updatedDeductions.push({
              id: sid,
              name: standardDeductionNames[sid],
              amount: autoDeductions[sid]
            });
          }
        });
        newDraft.deductions = updatedDeductions;
      }
      return newDraft;
    }));
  };

  const removeDraftItem = (empId, type, id) => {
    setPayrollDraft(prev => prev.map(draft => {
      if (draft.emp.id !== empId) return draft;

      const newDraft = {
        ...draft,
        [type]: draft[type].filter(item => item.id !== id)
      };

      if (type === 'earnings') {
        const taxableTotal = newDraft.earnings.filter(e => !e.isTaxFree).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const autoDeductions = recalculateDeductions({
          taxableTotal, employee: draft.emp, rates: insuranceRates, paymentMonth: currentMonthStr
        });

        const updatedDeductions = [...newDraft.deductions];
        standardDeductionIds.forEach(sid => {
          const idx = updatedDeductions.findIndex(d => d.id === sid);
          if (idx !== -1) {
            updatedDeductions[idx] = { ...updatedDeductions[idx], amount: autoDeductions[sid] };
          } else if (autoDeductions[sid] > 0) {
            updatedDeductions.push({ id: sid, name: standardDeductionNames[sid], amount: autoDeductions[sid] });
          }
        });
        newDraft.deductions = updatedDeductions;
      }
      return newDraft;
    }));
  };

  const addDraftItem = (empId, type) => {
    setPayrollDraft(prev => prev.map(draft => {
      if (draft.emp.id !== empId) return draft;

      const newDraft = {
        ...draft,
        [type]: [...draft[type], { id: Date.now().toString(), name: '', amount: 0, isTaxFree: false }]
      };

      if (type === 'earnings') {
        const taxableTotal = newDraft.earnings.filter(e => !e.isTaxFree).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const autoDeductions = recalculateDeductions({
          taxableTotal, employee: draft.emp, rates: insuranceRates, paymentMonth: currentMonthStr
        });

        const updatedDeductions = [...newDraft.deductions];
        standardDeductionIds.forEach(sid => {
          const idx = updatedDeductions.findIndex(d => d.id === sid);
          if (idx !== -1) {
            updatedDeductions[idx] = { ...updatedDeductions[idx], amount: autoDeductions[sid] };
          } else if (autoDeductions[sid] > 0) {
            updatedDeductions.push({ id: sid, name: standardDeductionNames[sid], amount: autoDeductions[sid] });
          }
        });
        newDraft.deductions = updatedDeductions;
      }
      return newDraft;
    }));
  };

  // 대장 합계 (필터 적용된 데이터 기준)
  const totals = filteredCurrentData.reduce((acc, curr) => {
    acc.taxableTotal += curr.taxableTotal;
    acc.totalDeductions += curr.totalDeductions;
    acc.netPay += curr.netPay;

    // 이 부분은 인쇄용 테이블을 위해 임시로 합산합니다.
    const base = curr.earnings.find(e => e.id === 'base')?.amount || 0;
    acc.basePay += base;
    acc.totalExtra += (curr.taxableTotal - base);

    acc.nationalPension += curr.deductions.find(d => d.id === 'np')?.amount || 0;
    acc.healthInsurance += curr.deductions.find(d => d.id === 'hi')?.amount || 0;
    acc.longTermCare += curr.deductions.find(d => d.id === 'ltc')?.amount || 0;
    acc.employmentInsurance += curr.deductions.find(d => d.id === 'ei')?.amount || 0;
    acc.incomeTax += curr.deductions.find(d => d.id === 'it')?.amount || 0;
    acc.residentTax += curr.deductions.find(d => d.id === 'rt')?.amount || 0;

    return acc;
  }, {
    basePay: 0, totalExtra: 0, taxableTotal: 0,
    nationalPension: 0, healthInsurance: 0, longTermCare: 0, employmentInsurance: 0, incomeTax: 0, residentTax: 0,
    totalDeductions: 0, netPay: 0
  });

  // 인쇄 동적 컨럼: 필터링된 데이터에서 지급/공제 항목명을 모두 수집
  const printColumns = useMemo(() => {
    const earningNames = new Set();
    const deductionNames = new Set();
    const sourceData = isSummaryMode
      ? (filterWorkplace === 'all' ? currentData : filteredCurrentData)
      : filteredCurrentData;

    sourceData.forEach(data => {
      data.earnings.forEach(e => { if (e.name) earningNames.add(e.name); });
      data.deductions.forEach(d => { if (d.name) deductionNames.add(d.name); });
    });
    return {
      earnings: Array.from(earningNames),
      deductions: Array.from(deductionNames)
    };
  }, [filteredCurrentData, currentData, isSummaryMode, filterWorkplace]);

  return (
    <div className="payroll-management">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>급여 관리</h2>
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
                <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={selectStyle}>
                  {Array.from({ length: 31 }, (_, i) => 2020 + i).map(y => (
                    <option key={y} value={y} style={{ background: '#0f172a', color: 'white' }}>{y}년</option>
                  ))}
                </select>
                <select value={targetMonth} onChange={e => setTargetMonth(Number(e.target.value))} style={selectStyle}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m} style={{ background: '#0f172a', color: 'white' }}>{m}월</option>
                  ))}
                </select>
              </div>
              {workplaceList.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)} style={selectStyle}>
                    <option value="all" style={{ background: '#0f172a' }}>사업장 전체</option>
                    {workplaceList.map(wp => (
                      <option key={wp} value={wp} style={{ background: '#0f172a' }}>{wp}</option>
                    ))}
                  </select>
                </div>
              )}
              {isFinalized && (
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', border: '1px solid var(--success-color)', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                  ✅ 마감됨 ({finalizedDate})
                </span>
              )}
            </div>
            <div style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></span>
              <strong>급여 지급 기한</strong>: 매월 10일 귀속분 지급
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isFinalized && hasPrevArchive && (
              <button className="btn btn-outline" onClick={handleCopyPrevMonth} style={{ color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                <Copy size={16} style={{ marginRight: '6px' }} /> {prevYear}년 {prevMonth}월 복사
              </button>
            )}
            {isFinalized && (
              <button className="btn btn-outline" onClick={handleUnfinalize} style={{ color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                마감 취소 (재계산)
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(96, 165, 250, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
              <input
                type="checkbox"
                id="summary-mode"
                checked={isSummaryMode}
                onChange={e => setIsSummaryMode(e.target.checked)}
              />
              <label htmlFor="summary-mode" style={{ fontSize: '13px', color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold' }}>사업장별 요약 인쇄</label>
            </div>
            <button className="btn btn-outline" onClick={handlePrint} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Printer size={16} style={{ marginRight: '6px' }} /> {isSummaryMode ? '요약 대장 인쇄' : '급여대장 인쇄'}
            </button>
            <button className="btn btn-primary" onClick={handleFinalize}>
              <CheckCircle size={16} style={{ marginRight: '6px' }} /> {isFinalized ? '마감 덮어쓰기' : '급여 마감'}
            </button>
          </div>
        </div>

        <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--primary-color)' }}>당월 지급/공제 현황 요약</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>해당 월의 리스트를 클릭하면 직원의 상세 수당과 공제 항목을 확인 및 직접 수정할 수 있습니다.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>과세 총액 (기본급+수당)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totals.taxableTotal.toLocaleString()}원</div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>공제 총액 (4대보험 등)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>- {totals.totalDeductions.toLocaleString()}원</div>
            </div>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>실지급 총액 (차인지급액)</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' }}>{totals.netPay.toLocaleString()}원</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '24px', marginBottom: '40px' }}>
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', alignSelf: 'start' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
                <tr>
                  <th style={{ ...thStyle, padding: '16px 12px' }}>이름</th>
                  <th style={{ ...thStyle, textAlign: 'right', padding: '16px 12px' }}>지급 총액</th>
                  <th style={{ ...thStyle, textAlign: 'right', padding: '16px 12px' }}>공제 총액</th>
                  <th style={{ ...thStyle, textAlign: 'right', padding: '16px 12px' }}>실지급액</th>
                </tr>
              </thead>
              <tbody>
                {filteredCurrentData.map((data) => (
                  <tr
                    key={data.emp.id}
                    onClick={() => setSelectedEmpIdState(data.emp.id)}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: selectedEmpId === data.emp.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ ...tdStyle, padding: '16px 12px' }}>
                      <strong>{data.emp.name}</strong>
                      {data.emp.resignation_date && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>퇴사</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', padding: '16px 12px', whiteSpace: 'nowrap' }}>{data.taxableTotal.toLocaleString()}원</td>
                    <td style={{ ...tdStyle, textAlign: 'right', padding: '16px 12px', whiteSpace: 'nowrap' }}>{data.totalDeductions.toLocaleString()}원</td>
                    <td style={{ ...tdStyle, textAlign: 'right', padding: '16px 12px', color: '#60a5fa', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{data.netPay.toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-card" style={{ alignSelf: 'start', position: 'sticky', top: '24px' }}>
            {selectedData ? (
              <>
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedData.emp.name} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>님의 급여 상세</span>
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    입사일: {selectedData.emp.join_date} / 계약기본급: {selectedData.emp.base_salary.toLocaleString()}원
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* 지급 상세 (Editable) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(16, 185, 129, 0.3)', paddingBottom: '4px', marginBottom: '12px' }}>
                      <h4 style={{ color: '#10b981', fontSize: '14px', margin: 0 }}>지급 상세 내역</h4>
                      <button onClick={() => addDraftItem(selectedData.emp.id, 'earnings')} className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '12px', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                        <Plus size={14} /> 추가
                      </button>
                    </div>
                    {selectedData.earnings.map(e => (
                      <div key={e.id} className="editable-row" style={detailRowStyle}>
                        <input
                          type="text"
                          value={e.name}
                          onChange={(ev) => updateDraft(selectedData.emp.id, 'earnings', e.id, 'name', ev.target.value)}
                          className="inline-input"
                          placeholder="항목명"
                          disabled={e.isFixed}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={e.amount ? Number(e.amount).toLocaleString() : ''}
                            onChange={(ev) => {
                              const numericVal = ev.target.value.replace(/[^0-9]/g, '');
                              updateDraft(selectedData.emp.id, 'earnings', e.id, 'amount', Number(numericVal));
                            }}
                            className="inline-input-num"
                            placeholder="0"
                          />
                          <span style={{ fontSize: '12px', marginRight: '4px' }}>원</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', cursor: 'pointer', opacity: e.isFixed ? 0.3 : 1 }}>
                            <input
                              type="checkbox"
                              checked={!!e.isTaxFree}
                              disabled={e.isFixed}
                              onChange={(ev) => updateDraft(selectedData.emp.id, 'earnings', e.id, 'isTaxFree', ev.target.checked)}
                            />
                            비과
                          </label>
                          {!e.isFixed && (
                            <button onClick={() => removeDraftItem(selectedData.emp.id, 'earnings', e.id)} className="delete-btn" title="항목 삭제">
                              <X size={14} />
                            </button>
                          )}
                          {e.isFixed && <div style={{ width: '22px' }}></div>}
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px' }}>
                        <span>지급 총계</span><span>{selectedData.totalGrossPay.toLocaleString()}원</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <span>(과세 대상: {selectedData.taxableTotal.toLocaleString()}원)</span>
                        <span>(비과세: {selectedData.nonTaxableTotal.toLocaleString()}원)</span>
                      </div>
                    </div>
                  </div>

                  {/* 공제 상세 (Editable) */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', paddingBottom: '4px', marginBottom: '12px' }}>
                      <h4 style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>공제 상세 내역</h4>
                      <button onClick={() => addDraftItem(selectedData.emp.id, 'deductions')} className="btn btn-outline" style={{ padding: '2px 6px', fontSize: '12px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                        <Plus size={14} /> 추가
                      </button>
                    </div>
                    {selectedData.deductions.map(d => (
                      <div key={d.id} className="editable-row" style={detailRowStyle}>
                        <input
                          type="text"
                          value={d.name}
                          onChange={(ev) => updateDraft(selectedData.emp.id, 'deductions', d.id, 'name', ev.target.value)}
                          className="inline-input"
                          placeholder="항목명"
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={d.amount ? Number(d.amount).toLocaleString() : ''}
                            onChange={(ev) => {
                              const numericVal = ev.target.value.replace(/[^0-9]/g, '');
                              updateDraft(selectedData.emp.id, 'deductions', d.id, 'amount', Number(numericVal));
                            }}
                            className="inline-input-num"
                            placeholder="0"
                          />
                          <span style={{ fontSize: '12px' }}>원</span>
                          <button onClick={() => removeDraftItem(selectedData.emp.id, 'deductions', d.id)} className="delete-btn" title="항목 삭제">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontWeight: 'bold', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <span>공제 총계</span><span>{selectedData.totalDeductions.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px', marginBottom: '12px' }}>
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', margin: 0 }}>관리자 메모</h4>
                  </div>
                  <textarea
                    value={selectedData.remarks || ''}
                    onChange={(e) => updateRemarks(selectedData.emp.id, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-primary)',
                      padding: '12px',
                      borderRadius: '8px',
                      minHeight: '80px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      transition: 'border 0.2s'
                    }}
                    onFocus={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.3)'}
                    onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                    placeholder="관리자 전용 메모나 기록해둘 특이사항을 입력하세요..."
                  />
                </div>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>실 차인지급액</span>
                    <strong style={{ fontSize: '24px', color: '#60a5fa' }}>{selectedData.netPay.toLocaleString()}원</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'right' }}>
                    산정 방식: 직접 수정됨 (초기값: {selectedData.calculationMethod})
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>직원을 선택해주세요.</div>
            )}
          </div>
        </div>
      </div>

      {/* 인쇄 전용 템플릿 - 동적 컨럼 */}
      <div className="print-only">
        <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '10px', fontWeight: 'bold' }}>
          {targetYear}년 {targetMonth}월 {isSummaryMode ? '사업장별 급여 요약대장' : '급여대장'} {filterWorkplace !== 'all' ? `(${filterWorkplace})` : ''}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
          <div><strong>법인명:</strong> {company.name}</div>
          <div><strong>사업장:</strong> {filterWorkplace === 'all' ? '전체' : filterWorkplace}</div>
        </div>
        <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ ...printThStyle, width: '24px' }}>순번</th>
              <th rowSpan={2} style={printThStyle}>{isSummaryMode ? '사업장' : '성명'}</th>
              <th colSpan={printColumns.earnings.length + 1} style={printThStyle}>지급내역 (원)</th>
              <th colSpan={printColumns.deductions.length + 1} style={printThStyle}>공제내역 (원)</th>
              <th rowSpan={2} style={printThStyle}>실지급액 (원)</th>
            </tr>
            <tr>
              {printColumns.earnings.map(name => (
                <th key={name} style={printThStyle}>{name}</th>
              ))}
              <th style={printThStyle}>지급계</th>
              {printColumns.deductions.map(name => (
                <th key={name} style={printThStyle}>{name}</th>
              ))}
              <th style={printThStyle}>공제계</th>
            </tr>
          </thead>
          <tbody>
            {!isSummaryMode ? filteredCurrentData.map((data, idx) => {
              const earningTotals = printColumns.earnings.map(name => {
                const item = data.earnings.find(e => e.name === name);
                return item ? Number(item.amount) || 0 : 0;
              });
              const deductionTotals = printColumns.deductions.map(name => {
                const item = data.deductions.find(d => d.name === name);
                return item ? Number(item.amount) || 0 : 0;
              });
              return (
                <tr key={data.emp.id}>
                  <td style={{ ...printTdStyle, textAlign: 'center', width: '24px' }}>{idx + 1}</td>
                  <td style={{ ...printTdStyle, textAlign: 'left', whiteSpace: 'nowrap' }}>{data.emp.name}</td>
                  {earningTotals.map((amt, i) => (
                    <td key={i} style={printTdStyle}>{amt > 0 ? amt.toLocaleString() : '-'}</td>
                  ))}
                  <td style={printTdStyle}><strong>{data.totalGrossPay.toLocaleString()}</strong></td>
                  {deductionTotals.map((amt, i) => (
                    <td key={i} style={printTdStyle}>{amt > 0 ? amt.toLocaleString() : '-'}</td>
                  ))}
                  <td style={printTdStyle}><strong>{data.totalDeductions.toLocaleString()}</strong></td>
                  <td style={printTdStyle}><strong>{data.netPay.toLocaleString()}</strong></td>
                </tr>
              );
            }) : workplaceSummaries.map((wp, idx) => {
              const earningTotals = printColumns.earnings.map(name => {
                const sourceData = filterWorkplace === 'all' ? currentData : filteredCurrentData;
                return sourceData
                  .filter(d => (d.emp.workplace || '부서미지정') === wp.name)
                  .reduce((sum, d) => {
                    const item = d.earnings.find(e => e.name === name);
                    return sum + (item ? Number(item.amount) || 0 : 0);
                  }, 0);
              });
              const deductionTotals = printColumns.deductions.map(name => {
                const sourceData = filterWorkplace === 'all' ? currentData : filteredCurrentData;
                return sourceData
                  .filter(d => (d.emp.workplace || '부서미지정') === wp.name)
                  .reduce((sum, d) => {
                    const item = d.deductions.find(e => e.name === name);
                    return sum + (item ? Number(item.amount) || 0 : 0);
                  }, 0);
              });
              return (
                <tr key={wp.name}>
                  <td style={{ ...printTdStyle, textAlign: 'center', width: '24px' }}>{idx + 1}</td>
                  <td style={{ ...printTdStyle, textAlign: 'left', whiteSpace: 'nowrap' }}>{wp.name} ({wp.count}명)</td>
                  {earningTotals.map((amt, i) => (
                    <td key={i} style={printTdStyle}>{amt > 0 ? amt.toLocaleString() : '-'}</td>
                  ))}
                  <td style={printTdStyle}><strong>{wp.taxableTotal.toLocaleString()}</strong></td>
                  {deductionTotals.map((amt, i) => (
                    <td key={i} style={printTdStyle}>{amt > 0 ? amt.toLocaleString() : '-'}</td>
                  ))}
                  <td style={printTdStyle}><strong>{wp.totalDeductions.toLocaleString()}</strong></td>
                  <td style={printTdStyle}><strong>{wp.netPay.toLocaleString()}</strong></td>
                </tr>
              );
            })}
            {/* 합계 행 */}
            <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
              <td colSpan={2} style={printTdStyle}>합계</td>
              {printColumns.earnings.map(name => {
                const sum = filteredCurrentData.reduce((s, d) => {
                  const item = d.earnings.find(e => e.name === name);
                  return s + (item ? Number(item.amount) || 0 : 0);
                }, 0);
                return <td key={name} style={printTdStyle}>{sum > 0 ? sum.toLocaleString() : '-'}</td>;
              })}
              <td style={printTdStyle}>{filteredCurrentData.reduce((s, d) => s + d.totalGrossPay, 0).toLocaleString()}</td>
              {printColumns.deductions.map(name => {
                const sum = filteredCurrentData.reduce((s, d) => {
                  const item = d.deductions.find(e => e.name === name);
                  return s + (item ? Number(item.amount) || 0 : 0);
                }, 0);
                return <td key={name} style={printTdStyle}>{sum > 0 ? sum.toLocaleString() : '-'}</td>;
              })}
              <td style={printTdStyle}>{totals.totalDeductions.toLocaleString()}</td>
              <td style={printTdStyle}>{totals.netPay.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 인라인 에디팅 전용 CSS */}
      <style>{`
        .editable-row {
          padding: 4px 6px;
          border-radius: 4px;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          margin-left: -6px;
          margin-right: -6px;
        }
        .editable-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .inline-input {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-primary);
          font-size: 14px;
          padding: 6px 8px;
          border-radius: 4px;
          flex: 1;
          margin-right: 12px;
          outline: none;
          transition: border 0.2s;
        }
        .inline-input:focus, .inline-input:hover:not(:disabled) {
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.3);
        }
        .inline-input:disabled {
          color: var(--text-secondary);
        }
        .inline-input-num {
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-primary);
          font-size: 14px;
          padding: 6px 8px;
          border-radius: 4px;
          width: 200px;
          text-align: right;
          outline: none;
          transition: border 0.2s;
        }
        .inline-input-num::-webkit-inner-spin-button, 
        .inline-input-num::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .inline-input-num:focus, .inline-input-num:hover {
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.3);
        }
        .delete-btn {
          opacity: 0;
          background: transparent;
          border: none;
          color: var(--danger-color);
          cursor: pointer;
          margin-left: 8px;
          padding: 2px;
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        .editable-row:hover .delete-btn {
          opacity: 1;
        }
        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        @media print { 
          @page { size: landscape; margin: 10mm; }
          .no-print { display: none !important; } 
          .print-only { display: block !important; } 
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

const selectStyle = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  outline: 'none',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const detailRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '4px',
  fontSize: '14px',
  color: 'var(--text-primary)'
};

const printThStyle = {
  border: '1px solid #000',
  padding: '4px 4px',
  textAlign: 'center',
  backgroundColor: '#f3f4f6',
  color: '#000',
  whiteSpace: 'nowrap'
};

const printTdStyle = {
  border: '1px solid #000',
  padding: '8px 4px',
  textAlign: 'right',
  color: '#000'
};

const thStyle = {
  padding: '16px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '16px',
  fontSize: '14px'
};
