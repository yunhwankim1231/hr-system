import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import COMPANY_INFO from '../config/companyInfo';
import { Printer, FileText, UserCircle, Calendar, Eye, EyeOff, Search } from 'lucide-react';

/* ───────── 주민번호 마스킹 헬퍼 ───────── */
function formatResidentId(emp, isMasked) {
  if (emp.resident_number) {
    return isMasked ? `${emp.resident_number.substring(0, 8)}******` : emp.resident_number;
  }
  if (!emp.birth_date) return '-';
  const d = new Date(emp.birth_date);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const front = `${yy}${mm}${dd}`;
  return isMasked ? `${front}-*******` : `${front}-1234567`;
}

/* ───────── 메인 컴포넌트 ───────── */
export default function WithholdingTaxLedger() {
  const { company, employees, payrollArchives } = useAppContext();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [isMasked, setIsMasked] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedEmp = useMemo(() => employees.find(e => e.id === selectedEmpId), [employees, selectedEmpId]);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(e => e.name.toLowerCase().includes(q));
  }, [employees, searchQuery]);

  /* 월별 데이터 가공 */
  const monthlyData = useMemo(() => {
    if (!selectedEmpId) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const archive = payrollArchives.find(a => a.year === targetYear && a.month === month);
      const empData = archive?.data?.find(d => d.emp.id === selectedEmpId);
      if (!empData) return { month, exists: false };

      const basePay = empData.earnings.find(e => e.id === 'base')?.amount || 0;
      const taxableExtras = empData.earnings.filter(e => e.id !== 'base' && !e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const taxFreeTotal = empData.earnings.filter(e => e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      
      const np = empData.deductions.find(d => d.id === 'np')?.amount || 0;
      const hi = empData.deductions.find(d => d.id === 'hi')?.amount || 0;
      const ltc = empData.deductions.find(d => d.id === 'ltc')?.amount || 0;
      const ei = empData.deductions.find(d => d.id === 'ei')?.amount || 0;
      const it = empData.deductions.find(d => d.id === 'it')?.amount || 0;
      const rt = empData.deductions.find(d => d.id === 'rt')?.amount || 0;

      return {
        month, exists: true, basePay, taxableExtras, taxFreeTotal,
        taxableTotal: basePay + taxableExtras,
        np, hi, ltc, ei, it, rt,
        netPay: (basePay + taxableExtras + taxFreeTotal) - (np + hi + ltc + ei + it + rt)
      };
    });
  }, [selectedEmpId, targetYear, payrollArchives]);

  const totals = useMemo(() => {
    return monthlyData.reduce((acc, m) => {
      if (!m.exists) return acc;
      acc.basePay += m.basePay;
      acc.taxableExtras += m.taxableExtras;
      acc.taxFreeTotal += m.taxFreeTotal;
      acc.taxableTotal += m.taxableTotal;
      acc.it += m.it;
      acc.rt += m.rt;
      acc.np += m.np;
      acc.hi += m.hi;
      acc.ltc += m.ltc;
      acc.ei += m.ei;
      acc.netPay += m.netPay;
      return acc;
    }, { basePay:0, taxableExtras:0, taxFreeTotal:0, taxableTotal:0, it:0, rt:0, np:0, hi:0, ltc:0, ei:0, netPay:0 });
  }, [monthlyData]);

  const handlePrint = useCallback(() => {
    setIsMasked(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsMasked(true), 500); }, 100);
  }, []);

  const years = [...new Set([...payrollArchives.map(p => p.year), new Date().getFullYear()])].sort((a, b) => b - a);

  return (
    <div className="ledger-container">
      {/* ── 사이드바 및 컨트롤 (No Print) ── */}
      <div className="no-print">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h2 className="text-gradient" style={{ fontSize:'28px', fontWeight:'800' }}>근로소득 원천징수부</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'13px' }}>[별지 제25호서식 (1)] 고정밀 이미지 레이아웃</p>
          </div>
          <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
            <div className="year-selector">
              <Calendar size={16} />
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}년</option>)}
              </select>
            </div>
            <button className="btn btn-outline" onClick={() => setIsMasked(!isMasked)}>
              {isMasked ? <Eye size={18}/> : <EyeOff size={18}/>}
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedEmp}>
              <Printer size={18} style={{ marginRight:'8px' }}/> 고정밀 인쇄
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'24px', alignItems:'start' }}>
          <div className="glass-card emp-list">
            <div className="search-bar">
              <Search size={16} />
              <input type="text" placeholder="이름 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="list-scroll">
              {filteredEmployees.map(emp => (
                <div key={emp.id} className={`emp-item ${selectedEmpId === emp.id ? 'active' : ''}`} onClick={() => setSelectedEmpId(emp.id)}>
                  <div className="emp-avatar">{emp.name[0]}</div>
                  <div className="emp-info">
                    <div className="name">{emp.name}</div>
                    <div className="meta">{emp.employment_type} · {emp.role || '소속'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="preview-area">
            {!selectedEmp ? (
              <div className="empty-msg">
                <FileText size={64} style={{ opacity:0.2, marginBottom:'16px' }} />
                <p>근로자를 선택하여 원천징수부 양식을 미리보기 하세요.</p>
              </div>
            ) : (
              <div className="form-view">
                <RenderFormImage emp={selectedEmp} year={targetYear} monthlyData={monthlyData} totals={totals} isMasked={isMasked} company={company || COMPANY_INFO} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 인쇄 전용 영역 ── */}
      {selectedEmp && (
        <div className="print-only">
          <RenderFormImage emp={selectedEmp} year={targetYear} monthlyData={monthlyData} totals={totals} isMasked={isMasked} company={company || COMPANY_INFO} />
        </div>
      )}

      <style>{`
        .ledger-container { padding: 24px; }
        .year-selector { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.2); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
        .year-selector select { background: transparent; border: none; color: white; font-weight: bold; cursor: pointer; outline: none; }
        
        .emp-list { padding: 0; overflow: hidden; }
        .search-bar { padding: 16px; border-bottom: 1px solid var(--card-border); display: flex; align-items: center; gap: 10px; position: relative; }
        .search-bar svg { position: absolute; left: 28px; color: var(--text-secondary); }
        .search-bar input { width: 100%; padding: 10px 12px 10px 36px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; }
        
        .list-scroll { max-height: 600px; overflow-y: auto; }
        .emp-item { padding: 14px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); transition: 0.2s; }
        .emp-item:hover { background: rgba(255,255,255,0.05); }
        .emp-item.active { background: rgba(59, 130, 246, 0.15); border-left: 3px solid #3b82f6; }
        .emp-avatar { width: 36px; height: 36px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justifyContent: center; font-weight: bold; color: white; }
        .emp-info .name { font-size: 14px; font-weight: 600; }
        .emp-info .meta { font-size: 11px; color: var(--text-secondary); }

        .preview-area { display: flex; justify-content: center; background: #334155; padding: 40px; border-radius: 12px; overflow-x: auto; }
        .empty-msg { color: #94a3b8; text-align: center; padding: 100px 0; }
        
        /* ── 절대 좌표 기반 서식 컨테이너 ── */
        .form-page {
          width: 297mm; /* A4 Landscape width */
          height: 210mm; /* A4 Landscape height */
          background-size: cover;
          background-position: center;
          position: relative;
          background-color: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.3);
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .data-field {
          position: absolute;
          font-family: "Malgun Gothic", dotum, sans-serif;
          color: #000;
          font-size: 9.5pt;
          white-space: nowrap;
          pointer-events: none;
        }

        @media print {
          @page { size: A4 landscape; margin: 0; }
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 297mm; }
          .form-page { box-shadow: none; margin: 0; page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { background: white; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
    [별지 제25호서식(1)] 절대 좌표 이미지 렌더링 (3페이지 구성)
   ════════════════════════════════════════════════════════════ */
function RenderFormImage({ emp, year, monthlyData, totals, isMasked, company }) {
  const fmt = v => (v === 0 ? '' : (v || '').toLocaleString());

  const p1 = "/9.소득세법 제25호 소득자별 근로소득 원천징수부, 소득자별 사업소득 원천징수부, 소득자별 연금소득 원천징수부-images-0.jpg";
  const p2 = "/9.소득세법 제25호 소득자별 근로소득 원천징수부, 소득자별 사업소득 원천징수부, 소득자별 연금소득 원천징수부-images-1.jpg";
  const p3 = "/9.소득세법 제25호 소득자별 근로소득 원천징수부, 소득자별 사업소득 원천징수부, 소득자별 연금소득 원천징수부-images-2.jpg";

  return (
    <>
      {/* ── Page 1: 기본정보 + Ⅰ. 근로소득지급명세 ── */}
      <div className="form-page" style={{ backgroundImage: `url("${p1}")`, backgroundSize:'100% 100%' }}>
        <div className="data-field" style={{ top: '11.0%', left: '12.0%' }}>{year}</div>
        
        {/* 징수의무자 */}
        <div className="data-field" style={{ top: '15.6%', left: '26.5%' }}>{company.name}</div>
        <div className="data-field" style={{ top: '18.2%', left: '26.5%' }}>{company.businessNumber}</div>
        <div className="data-field" style={{ top: '21.0%', left: '26.5%', fontSize:'8.5pt' }}>{company.address}</div>

        {/* 소득자 */}
        <div className="data-field" style={{ top: '26.5%', left: '26.5%' }}>{emp.name}</div>
        <div className="data-field" style={{ top: '26.5%', left: '55.5%', letterSpacing:'1px' }}>{formatResidentId(emp, isMasked)}</div>
        <div className="data-field" style={{ top: '25.0%', left: '77.5%', fontSize:'9pt' }}>{emp.join_date}</div>
        <div className="data-field" style={{ top: '26.8%', left: '77.5%', fontSize:'9pt' }}>{emp.resignation_date || ''}</div>
        <div className="data-field" style={{ top: '29.2%', left: '33%' }}>내국인</div>
        <div className="data-field" style={{ top: '31.8%', left: '33%' }}>{emp.dependents || 1}</div>
        <div className="data-field" style={{ top: '34.5%', left: '33%' }}>{emp.children_count || 0}</div>

        {/* 월별 지급명세 */}
        {monthlyData.map((m, i) => {
          const rowTop = 54.0 + (i * 3.65);
          if (!m.exists) return null;
          return (
            <React.Fragment key={`p1-${m.month}`}>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '17.8%', textAlign:'right', width:'65px' }}>{fmt(m.basePay)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '24.2%', textAlign:'right', width:'55px' }}>{fmt(m.taxableExtras)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '62.2%', textAlign:'right', width:'75px', fontWeight:'bold' }}>{fmt(m.taxableTotal)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '72.5%', textAlign:'right', width:'65px' }}>{fmt(m.it)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '82.2%', textAlign:'right', width:'70px', fontWeight:'bold' }}>{fmt(m.it)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '89.5%', textAlign:'right', width:'60px' }}>{fmt(m.rt)}</div>
            </React.Fragment>
          );
        })}
        {/* 합계 */}
        <div className="data-field" style={{ top: '97.8%', left: '17.8%', textAlign:'right', width:'65px', fontWeight:'bold' }}>{fmt(totals.basePay)}</div>
        <div className="data-field" style={{ top: '97.8%', left: '24.2%', textAlign:'right', width:'55px', fontWeight:'bold' }}>{fmt(totals.taxableExtras)}</div>
        <div className="data-field" style={{ top: '97.8%', left: '62.2%', textAlign:'right', width:'75px', fontWeight:'bold' }}>{fmt(totals.taxableTotal)}</div>
        <div className="data-field" style={{ top: '97.8%', left: '72.5%', textAlign:'right', width:'65px', fontWeight:'bold' }}>{fmt(totals.it)}</div>
        <div className="data-field" style={{ top: '97.8%', left: '82.2%', textAlign:'right', width:'70px', fontWeight:'bold' }}>{fmt(totals.it)}</div>
        <div className="data-field" style={{ top: '97.8%', left: '89.5%', textAlign:'right', width:'60px', fontWeight:'bold' }}>{fmt(totals.rt)}</div>
      </div>

      {/* ── Page 2: Ⅱ. 비과세소득 ── */}
      <div className="form-page" style={{ backgroundImage: `url("${p2}")`, backgroundSize:'100% 100%' }}>
        {monthlyData.map((m, i) => {
          const rowTop = 28.8 + (i * 4.14);
          if (!m.exists) return null;
          return (
            <React.Fragment key={`p2-${m.month}`}>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '56.5%', textAlign:'right', width:'75px' }}>{fmt(m.taxFreeTotal)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '86.5%', textAlign:'right', width:'80px' }}>{fmt(m.taxFreeTotal)}</div>
            </React.Fragment>
          );
        })}
        <div className="data-field" style={{ top: '82.8%', left: '56.5%', textAlign:'right', width:'75px', fontWeight:'bold' }}>{fmt(totals.taxFreeTotal)}</div>
        <div className="data-field" style={{ top: '82.8%', left: '86.5%', textAlign:'right', width:'80px', fontWeight:'bold' }}>{fmt(totals.taxFreeTotal)}</div>
      </div>

      {/* ── Page 3: Ⅲ. 근로소득원천징수액 등 ── */}
      <div className="form-page" style={{ backgroundImage: `url("${p3}")`, backgroundSize:'100% 100%' }}>
        {monthlyData.map((m, i) => {
          const rowTop = 25.8 + (i * 4.3);
          if (!m.exists) return null;
          return (
            <React.Fragment key={`p3-${m.month}`}>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '32.2%', textAlign:'right', width:'60px' }}>{fmt(m.it)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '39.2%', textAlign:'right', width:'60px' }}>{fmt(m.rt)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '60.5%', textAlign:'right', width:'65px' }}>{fmt(m.np)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '68.5%', textAlign:'right', width:'65px' }}>{fmt(m.hi + m.ltc)}</div>
              <div className="data-field" style={{ top: `${rowTop}%`, left: '76.2%', textAlign:'right', width:'60px' }}>{fmt(m.ei)}</div>
            </React.Fragment>
          );
        })}
        {/* 합계 */}
        <div className="data-field" style={{ top: '81.8%', left: '32.2%', textAlign:'right', width:'60px', fontWeight:'bold' }}>{fmt(totals.it)}</div>
        <div className="data-field" style={{ top: '81.8%', left: '39.2%', textAlign:'right', width:'60px', fontWeight:'bold' }}>{fmt(totals.rt)}</div>
        <div className="data-field" style={{ top: '81.8%', left: '60.5%', textAlign:'right', width:'65px', fontWeight:'bold' }}>{fmt(totals.np)}</div>
        <div className="data-field" style={{ top: '81.8%', left: '68.5%', textAlign:'right', width:'65px', fontWeight:'bold' }}>{fmt(totals.hi + totals.ltc)}</div>
        <div className="data-field" style={{ top: '81.8%', left: '76.2%', textAlign:'right', width:'60px', fontWeight:'bold' }}>{fmt(totals.ei)}</div>

        {/* 하단 푸터 */}
        <div className="data-field" style={{ top: '86.8%', left: '32%' }}>{new Date().getFullYear()}</div>
        <div className="data-field" style={{ top: '86.8%', left: '35.5%' }}>{new Date().getMonth() + 1}</div>
        <div className="data-field" style={{ top: '86.8%', left: '38.5%' }}>{new Date().getDate()}</div>
        
        <div className="data-field" style={{ top: '86.8%', left: '55%' }}>{company.name}</div>
        <div className="data-field" style={{ top: '86.8%', left: '80%', fontWeight:'bold' }}>{company.name} (인)</div>
        
        {(company.seal_url || company.sealImagePath) && (
          <img 
            src={company.seal_url || company.sealImagePath} 
            alt="직인" 
            style={{ position: 'absolute', top: '84.8%', left: '92%', width: '50px', height: '50px', opacity: 0.8 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
    </>
  );
}