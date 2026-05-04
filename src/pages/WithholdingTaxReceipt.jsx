import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { WithholdingFormPage1 } from '../utils/withholdingFormRenderer';
import { Printer, FileCheck, UserCircle, Calendar, Eye, EyeOff } from 'lucide-react';

const fmt = v => (v || 0).toLocaleString();

export default function WithholdingTaxReceipt() {
  const { company, employees, payrollArchives } = useAppContext();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [isMasked, setIsMasked] = useState(true);
  const [debug, setDebug] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q));
  }, [employees, searchQuery]);

  /* 연간 데이터 집계 */
  const data = useMemo(() => {
    if (!selectedEmpId) return null;
    const archives = payrollArchives.filter(a => a.year === targetYear).sort((a, b) => a.month - b.month);
    let salary = 0, bonus = 0, taxFreeSum = 0;
    let np = 0, hi = 0, ltc = 0, ei = 0, it = 0, rt = 0;
    const tfMap = {};
    let months = 0;

    archives.forEach(arc => {
      const ed = arc.data?.find(d => d.emp.id === selectedEmpId);
      if (!ed) return;
      months++;
      const basePay = ed.earnings.find(e => e.id === 'base')?.amount || 0;
      const extras = ed.earnings.filter(e => e.id !== 'base' && !e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const tfItems = ed.earnings.filter(e => e.isTaxFree);
      salary += basePay;
      bonus += extras;
      tfItems.forEach(item => {
        const nm = item.name || '기타';
        tfMap[nm] = (tfMap[nm] || 0) + (Number(item.amount) || 0);
        taxFreeSum += Number(item.amount) || 0;
      });
      np += ed.deductions.find(d => d.id === 'np')?.amount || 0;
      hi += ed.deductions.find(d => d.id === 'hi')?.amount || 0;
      ltc += ed.deductions.find(d => d.id === 'ltc')?.amount || 0;
      ei += ed.deductions.find(d => d.id === 'ei')?.amount || 0;
      it += ed.deductions.find(d => d.id === 'it')?.amount || 0;
      rt += ed.deductions.find(d => d.id === 'rt')?.amount || 0;
    });

    const totalPay = salary + bonus;
    const ins = np + hi + ltc + ei;
    // 마감 데이터가 없어도 0원 기본값으로 양식을 보여줌
    return { year: targetYear, months, salary, bonus, taxFreeSum, totalPay, np, hi, ltc, ei, ins, it, rt, tfMap };
  }, [selectedEmpId, targetYear, payrollArchives]);

  const handlePrint = useCallback(() => {
    setIsMasked(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsMasked(true), 500); }, 100);
  }, []);

  const years = [...new Set([...payrollArchives.map(p => p.year), new Date().getFullYear()])].sort((a, b) => b - a);

  return (
    <div className="withholding-receipt">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">근로소득 원천징수영수증</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              소득세법 시행규칙 [별지 제24호 서식(1)] · 개정 2021.3.16. · 법정 양식 재현
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }}/>
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))}
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {years.map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}년 귀속</option>)}
              </select>
            </div>
            <button className="btn btn-outline" onClick={() => setIsMasked(!isMasked)} title={isMasked ? '주민번호 표시' : '주민번호 숨기기'}>
              {isMasked ? <Eye size={18}/> : <EyeOff size={18}/>}
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedEmp || !data}>
              <Printer size={18} style={{ marginRight: '6px' }}/> 영수증 인쇄
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.05)', fontWeight: '600', fontSize: '14px' }}>대상 근로자</div>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input type="text" placeholder="이름 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', outline: 'none' }}/>
            </div>
            <div style={{ maxHeight: '550px', overflowY: 'auto' }}>
              {filteredEmployees.map(emp => (
                <div key={emp.id} onClick={() => setSelectedEmpId(emp.id)}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedEmpId === emp.id ? 'rgba(139,92,246,0.15)' : 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <UserCircle size={18} style={{ color: selectedEmpId === emp.id ? '#a78bfa' : '#64748b' }}/>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{emp.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.employment_type} · {emp.role || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', padding: '12px' }}>
            {!selectedEmp ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileCheck size={48} style={{ marginBottom: '16px', opacity: 0.3 }}/>
                <p>좌측에서 근로자를 선택하면<br/>법정 양식이 생성됩니다.</p>
              </div>
            ) : (
              <div>
                {data && data.months === 0 && (
                  <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', fontSize: '13px', color: '#fbbf24' }}>
                    ⚠️ {targetYear}년도 마감된 급여 기록이 없습니다. 양식 미리보기(0원)가 표시됩니다.
                  </div>
                )}
                <div style={{ border: '1px solid #ccc', borderRadius: '4px', overflow: 'hidden' }}>
                  {data && <WithholdingFormPage1 emp={selectedEmp} data={data} isMasked={isMasked} debug={debug} setDebug={setDebug} company={company} />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEmp && data && (
        <div className="print-only" style={{ background: '#fff', padding: '10mm' }}>
          <WithholdingFormPage1 emp={selectedEmp} data={data} isMasked={isMasked} debug={false} setDebug={() => {}} company={company} />
        </div>
      )}

      <style>{`
        @media print {
          .withholding-receipt .print-only { display: block !important; }
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 portrait; margin: 0; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
