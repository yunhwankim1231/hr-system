import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import COMPANY_INFO from '../config/companyInfo';
import { Printer, FileCheck, UserCircle, Calendar, Eye, EyeOff } from 'lucide-react';

/* 주민번호 헬퍼 */
function formatResidentId(birthDate, masked) {
  if (!birthDate) return '-';
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const front = `${yy}${mm}${dd}`;
  return masked ? `${front}-*******` : `${front}-1234567`;
}

const TAX_FREE_CODES = {
  '식대': { code: 'H01', limit: 200000 },
  '자가운전보조금': { code: 'O01', limit: 200000 },
  '출산보육수당': { code: 'G01', limit: 100000 },
  '연구활동비': { code: 'M01', limit: 200000 },
};

export default function WithholdingTaxReceipt() {
  const { employees, payrollArchives } = useAppContext();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [isMasked, setIsMasked] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q));
  }, [employees, searchQuery]);

  /* 연간 데이터 집계 */
  const annualData = useMemo(() => {
    if (!selectedEmpId) return null;
    const yearArchives = payrollArchives.filter(a => a.year === targetYear).sort((a, b) => a.month - b.month);
    
    let totalTaxable = 0, totalTaxFree = 0, totalGross = 0;
    let totalNp = 0, totalHi = 0, totalLtc = 0, totalEi = 0;
    let totalIt = 0, totalRt = 0;
    const taxFreeMap = {};
    let monthCount = 0;

    yearArchives.forEach(archive => {
      const empData = archive.data?.find(d => d.emp.id === selectedEmpId);
      if (!empData) return;
      monthCount++;

      const basePay = empData.earnings.find(e => e.id === 'base')?.amount || 0;
      const taxableExtras = empData.earnings.filter(e => e.id !== 'base' && !e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const taxFreeItems = empData.earnings.filter(e => e.isTaxFree);
      const taxFreeSum = taxFreeItems.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      totalTaxable += basePay + taxableExtras;
      totalTaxFree += taxFreeSum;
      totalGross += basePay + taxableExtras + taxFreeSum;

      totalNp += empData.deductions.find(d => d.id === 'np')?.amount || 0;
      totalHi += empData.deductions.find(d => d.id === 'hi')?.amount || 0;
      totalLtc += empData.deductions.find(d => d.id === 'ltc')?.amount || 0;
      totalEi += empData.deductions.find(d => d.id === 'ei')?.amount || 0;
      totalIt += empData.deductions.find(d => d.id === 'it')?.amount || 0;
      totalRt += empData.deductions.find(d => d.id === 'rt')?.amount || 0;

      taxFreeItems.forEach(item => {
        const key = item.name || '기타 비과세';
        if (!taxFreeMap[key]) taxFreeMap[key] = 0;
        taxFreeMap[key] += Number(item.amount) || 0;
      });
    });

    const totalInsurance = totalNp + totalHi + totalLtc + totalEi;
    // 결정세액 = 기납부세액(매월 원천징수 합계)과 동일하게 처리 (연말정산 미반영 시)
    const determinedTax = totalIt;
    const determinedResident = totalRt;
    const paidTax = totalIt;
    const paidResident = totalRt;
    const diffTax = determinedTax - paidTax;
    const diffResident = determinedResident - paidResident;

    return {
      monthCount, totalTaxable, totalTaxFree, totalGross,
      totalNp, totalHi, totalLtc, totalEi, totalInsurance,
      totalIt, totalRt,
      determinedTax, determinedResident, paidTax, paidResident, diffTax, diffResident,
      taxFreeMap
    };
  }, [selectedEmpId, targetYear, payrollArchives]);

  const handlePrint = useCallback(() => {
    setIsMasked(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsMasked(true), 500); }, 100);
  }, []);

  const years = [...new Set([...payrollArchives.map(p => p.year), new Date().getFullYear()])].sort((a, b) => b - a);
  const fmt = v => (v || 0).toLocaleString();

  const B = '1px solid #333';
  const cellBase = { border: B, padding: '5px 8px', fontSize: '11px', textAlign: 'center', verticalAlign: 'middle' };
  const cellR = { ...cellBase, textAlign: 'right', paddingRight: '10px' };
  const cellL = { ...cellBase, textAlign: 'left', paddingLeft: '10px' };
  const hCell = { ...cellBase, background: '#f0f4f8', fontWeight: '600', fontSize: '10px' };

  const formContent = selectedEmp && annualData ? (
    <div style={{ color: '#000', background: '#fff', padding: '30px', fontFamily: "'Noto Sans KR', sans-serif" }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '8px' }}>근로소득 원천징수영수증</h1>
        <p style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>(소득세법 시행규칙 별지 제23호 서식(1)) / {targetYear}년 귀속</p>
      </div>

      {/* ① 원천징수의무자 · 소득자 정보 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <tbody>
          <tr>
            <td style={{ ...hCell, width: '90px' }} rowSpan="3">원천징수<br/>의무자</td>
            <td style={{ ...hCell, width: '90px' }}>법인명(상호)</td>
            <td style={{ ...cellL, width: '180px' }}>{COMPANY_INFO.name}</td>
            <td style={{ ...hCell, width: '100px' }}>사업자등록번호</td>
            <td style={{ ...cellBase, width: '130px' }}>{COMPANY_INFO.businessNumber}</td>
            <td style={{ ...hCell, width: '60px' }} rowSpan="3">소득자</td>
            <td style={{ ...hCell, width: '70px' }}>성 명</td>
            <td style={{ ...cellBase }}>{selectedEmp.name}</td>
          </tr>
          <tr>
            <td style={hCell}>대표자</td>
            <td style={cellL}>{COMPANY_INFO.ceoName}</td>
            <td style={hCell}>법인등록번호</td>
            <td style={cellBase}>{COMPANY_INFO.corporateNumber}</td>
            <td style={hCell}>주민등록번호</td>
            <td style={{ ...cellBase, letterSpacing: '1px' }}>{formatResidentId(selectedEmp.birth_date, isMasked)}</td>
          </tr>
          <tr>
            <td style={hCell}>주 소</td>
            <td style={{ ...cellL, fontSize: '9px' }} colSpan="3">{COMPANY_INFO.address}</td>
            <td style={hCell}>주 소</td>
            <td style={{ ...cellL, fontSize: '9px' }}>{selectedEmp.address || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* ② 근무처별 소득 명세 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr><th style={hCell} colSpan="6">② 근무처별 소득 명세</th></tr>
          <tr>
            <th style={hCell}>근무기간</th>
            <th style={hCell}>급 여</th>
            <th style={hCell}>상여 등</th>
            <th style={hCell}>인정상여</th>
            <th style={hCell}>비과세소득 계</th>
            <th style={hCell}>과세소득 합계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellBase}>{selectedEmp.join_date} ~ {selectedEmp.resignation_date || `${targetYear}-12-31`}</td>
            <td style={cellR}>{fmt(annualData.totalTaxable)}</td>
            <td style={cellR}>0</td>
            <td style={cellR}>0</td>
            <td style={cellR}>{fmt(annualData.totalTaxFree)}</td>
            <td style={{ ...cellR, fontWeight: 'bold' }}>{fmt(annualData.totalTaxable)}</td>
          </tr>
        </tbody>
      </table>

      {/* ③ 비과세 소득 명세 */}
      <table style={{ width: '50%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr><th style={hCell} colSpan="3">③ 비과세 소득 명세</th></tr>
          <tr>
            <th style={hCell}>소득 항목</th>
            <th style={hCell}>코 드</th>
            <th style={hCell}>금 액</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const entries = Object.entries(annualData.taxFreeMap);
            if (entries.length === 0) return <tr><td style={cellBase} colSpan="3">해당 없음</td></tr>;
            return entries.map(([name, total]) => (
              <tr key={name}>
                <td style={cellL}>{name}</td>
                <td style={cellBase}>{TAX_FREE_CODES[name]?.code || 'Q01'}</td>
                <td style={cellR}>{total.toLocaleString()}</td>
              </tr>
            ));
          })()}
        </tbody>
      </table>

      {/* ④ 세액 명세 (4대보험 + 소득세) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr><th style={hCell} colSpan="6">④ 사회보험료 공제 명세 (근로자 부담분)</th></tr>
        </thead>
        <tbody>
          <tr>
            <td style={hCell}>국민연금</td><td style={cellR}>{fmt(annualData.totalNp)}</td>
            <td style={hCell}>건강보험</td><td style={cellR}>{fmt(annualData.totalHi)}</td>
            <td style={hCell}>장기요양보험</td><td style={cellR}>{fmt(annualData.totalLtc)}</td>
          </tr>
          <tr>
            <td style={hCell}>고용보험</td><td style={cellR}>{fmt(annualData.totalEi)}</td>
            <td style={hCell}>보험료 합계</td><td style={{ ...cellR, fontWeight: 'bold' }} colSpan="3">{fmt(annualData.totalInsurance)}</td>
          </tr>
        </tbody>
      </table>

      {/* ⑤ 결정세액 · 기납부세액 · 차감징수세액 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr><th style={hCell} colSpan="4">⑤ 세액의 계산 (결정세액 · 기납부세액 · 차감징수세액)</th></tr>
          <tr>
            <th style={{ ...hCell, width: '25%' }}>구 분</th>
            <th style={{ ...hCell, width: '25%' }}>소득세</th>
            <th style={{ ...hCell, width: '25%' }}>지방소득세</th>
            <th style={{ ...hCell, width: '25%' }}>합 계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={hCell}>⑥ 결정세액</td>
            <td style={cellR}>{fmt(annualData.determinedTax)}</td>
            <td style={cellR}>{fmt(annualData.determinedResident)}</td>
            <td style={{ ...cellR, fontWeight: 'bold' }}>{fmt(annualData.determinedTax + annualData.determinedResident)}</td>
          </tr>
          <tr>
            <td style={hCell}>⑦ 기납부세액<br/><span style={{ fontSize: '9px', fontWeight: 'normal' }}>(매월 원천징수 합계)</span></td>
            <td style={cellR}>{fmt(annualData.paidTax)}</td>
            <td style={cellR}>{fmt(annualData.paidResident)}</td>
            <td style={{ ...cellR, fontWeight: 'bold' }}>{fmt(annualData.paidTax + annualData.paidResident)}</td>
          </tr>
          <tr style={{ background: annualData.diffTax + annualData.diffResident > 0 ? '#fff3f3' : annualData.diffTax + annualData.diffResident < 0 ? '#f0f8ff' : '#f8f8f8' }}>
            <td style={{ ...hCell, fontSize: '12px' }}>⑧ 차감징수세액<br/><span style={{ fontSize: '9px', fontWeight: 'normal' }}>(⑥ - ⑦, 음수=환급)</span></td>
            <td style={{ ...cellR, fontSize: '14px', fontWeight: 'bold', color: annualData.diffTax < 0 ? '#2563eb' : annualData.diffTax > 0 ? '#dc2626' : '#000' }}>
              {annualData.diffTax < 0 ? '△ ' : ''}{fmt(Math.abs(annualData.diffTax))}
            </td>
            <td style={{ ...cellR, fontSize: '14px', fontWeight: 'bold', color: annualData.diffResident < 0 ? '#2563eb' : annualData.diffResident > 0 ? '#dc2626' : '#000' }}>
              {annualData.diffResident < 0 ? '△ ' : ''}{fmt(Math.abs(annualData.diffResident))}
            </td>
            <td style={{ ...cellR, fontSize: '16px', fontWeight: 'bold' }}>
              {fmt(annualData.diffTax + annualData.diffResident)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 하단: 발급일 및 직인 */}
      <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', lineHeight: '2' }}>
        <p>위의 원천징수영수증(지급조서)을 「소득세법」 제143조 및 같은 법 시행령 제213조에 의하여 발급합니다.</p>
        <p style={{ marginTop: '20px', fontSize: '14px' }}>{new Date().getFullYear()}년 {String(new Date().getMonth() + 1).padStart(2, '0')}월 {String(new Date().getDate()).padStart(2, '0')}일</p>
        <div style={{ marginTop: '30px', position: 'relative', display: 'inline-block' }}>
          <p style={{ fontSize: '14px' }}>징수의무자 {COMPANY_INFO.name}</p>
          <p style={{ fontSize: '14px' }}>대표이사 {COMPANY_INFO.ceoName} (인)</p>
          <img src={COMPANY_INFO.sealImagePath} alt="" style={{ position: 'absolute', right: '-30px', bottom: '-15px', width: '80px', height: '80px', opacity: 0.7 }} onError={e => { e.target.style.display = 'none'; }}/>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="withholding-receipt">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileCheck size={28} style={{ color: '#a78bfa' }}/> 근로소득 원천징수영수증
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>소득세법 시행규칙 [별지 제23호 서식(1)] · 연간 요약 · 결정세액/기납부세액/차감징수세액 포함</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }}/>
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                {years.map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}년 귀속</option>)}
              </select>
            </div>
            <button className="btn btn-outline" onClick={() => setIsMasked(!isMasked)}>
              {isMasked ? <Eye size={18}/> : <EyeOff size={18}/>}
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedEmp || !annualData}>
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
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
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

          <div className="glass-card" style={{ overflowX: 'auto' }}>
            {!selectedEmp ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileCheck size={48} style={{ marginBottom: '16px', opacity: 0.3 }}/>
                <p>좌측에서 근로자를 선택하면 원천징수영수증이 생성됩니다.</p>
              </div>
            ) : !annualData || annualData.monthCount === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p><strong>{selectedEmp.name}</strong>님의 {targetYear}년도 마감된 급여 기록이 없습니다.</p>
              </div>
            ) : (
              <div style={{ borderRadius: '8px', overflow: 'hidden' }}>
                {formContent}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedEmp && annualData && annualData.monthCount > 0 && (
        <div className="print-only" style={{ padding: '15mm', background: '#fff' }}>
          {formContent}
        </div>
      )}

      <style>{`
        @media print {
          .withholding-receipt { @page { size: A4 portrait; margin: 10mm; } }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
