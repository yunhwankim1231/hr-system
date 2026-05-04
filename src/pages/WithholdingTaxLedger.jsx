import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import COMPANY_INFO from '../config/companyInfo';
import { Printer, FileText, UserCircle, Calendar, Eye, EyeOff } from 'lucide-react';

/* ───────── 비과세 소득 유형 코드표 ───────── */
const TAX_FREE_CODES = {
  '식대': { code: 'H01', limit: 200000 },
  '자가운전보조금': { code: 'O01', limit: 200000 },
  '출산보육수당': { code: 'G01', limit: 100000 },
  '연구활동비': { code: 'M01', limit: 200000 },
};

/* ───────── 주민번호 헬퍼 ───────── */
function formatResidentId(birthDate, masked) {
  if (!birthDate) return '-';
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const front = `${yy}${mm}${dd}`;
  return masked ? `${front}-*******` : `${front}-1234567`;
}

/* ───────── 컴포넌트 ───────── */
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

  /* 해당 연도의 월별 아카이브에서 해당 직원 데이터 추출 */
  const monthlyData = useMemo(() => {
    if (!selectedEmpId) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const archive = payrollArchives.find(a => a.year === targetYear && a.month === month);
      const empData = archive?.data?.find(d => d.emp.id === selectedEmpId);
      if (!empData) return { month, exists: false };

      const basePay = empData.earnings.find(e => e.id === 'base')?.amount || 0;
      const taxableExtras = empData.earnings.filter(e => e.id !== 'base' && !e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const taxFreeItems = empData.earnings.filter(e => e.isTaxFree);
      const taxFreeTotal = taxFreeItems.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const taxableTotal = basePay + taxableExtras;

      const np = empData.deductions.find(d => d.id === 'np')?.amount || 0;
      const hi = empData.deductions.find(d => d.id === 'hi')?.amount || 0;
      const ltc = empData.deductions.find(d => d.id === 'ltc')?.amount || 0;
      const ei = empData.deductions.find(d => d.id === 'ei')?.amount || 0;
      const it = empData.deductions.find(d => d.id === 'it')?.amount || 0;
      const rt = empData.deductions.find(d => d.id === 'rt')?.amount || 0;
      const totalDeductions = np + hi + ltc + ei + it + rt;

      return {
        month, exists: true, basePay, taxableExtras, taxFreeTotal, taxFreeItems,
        taxableTotal, np, hi, ltc, ei, it, rt, totalDeductions,
        netPay: taxableTotal + taxFreeTotal - totalDeductions
      };
    });
  }, [selectedEmpId, targetYear, payrollArchives]);

  /* 연간 합계 */
  const annualTotals = useMemo(() => {
    return monthlyData.filter(m => m.exists).reduce((acc, m) => {
      acc.basePay += m.basePay; acc.taxableExtras += m.taxableExtras;
      acc.taxFreeTotal += m.taxFreeTotal; acc.taxableTotal += m.taxableTotal;
      acc.np += m.np; acc.hi += m.hi; acc.ltc += m.ltc; acc.ei += m.ei;
      acc.it += m.it; acc.rt += m.rt; acc.totalDeductions += m.totalDeductions;
      acc.netPay += m.netPay;
      return acc;
    }, { basePay:0, taxableExtras:0, taxFreeTotal:0, taxableTotal:0, np:0, hi:0, ltc:0, ei:0, it:0, rt:0, totalDeductions:0, netPay:0 });
  }, [monthlyData]);

  /* 인쇄 핸들러 - 인쇄 시 마스킹 해제 */
  const handlePrint = useCallback(() => {
    setIsMasked(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsMasked(true), 500); }, 100);
  }, []);

  const years = [...new Set([...payrollArchives.map(p => p.year), new Date().getFullYear()])].sort((a, b) => b - a);
  const fmt = v => (v || 0).toLocaleString();

  /* ══════ 공통 테이블 스타일 (법정 양식 모방) ══════ */
  const B = '1px solid #333';
  const cellBase = { border: B, padding: '4px 6px', fontSize: '11px', textAlign: 'center', verticalAlign: 'middle' };
  const cellR = { ...cellBase, textAlign: 'right', paddingRight: '8px' };
  const headerCell = { ...cellBase, background: '#f0f4f8', fontWeight: '600', fontSize: '10px' };

  return (
    <div className="withholding-ledger">
      {/* ── 화면 UI (no-print) ── */}
      <div className="no-print">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
          <div>
            <h2 style={{ fontSize:'28px', fontWeight:'800' }} className="text-gradient">근로소득 원천징수부</h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'13px', marginTop:'4px' }}>소득세법 시행규칙 [별지 제24호 서식(1)] 법정 양식</p>
          </div>
          <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', background:'rgba(0,0,0,0.2)', padding:'6px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={16} style={{ marginRight:'8px', color:'var(--text-secondary)' }}/>
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={{ background:'transparent', border:'none', color:'white', outline:'none', fontSize:'14px', fontWeight:'bold', cursor:'pointer' }}>
                {years.map(y => <option key={y} value={y} style={{ background:'#0f172a' }}>{y}년</option>)}
              </select>
            </div>
            <button className="btn btn-outline" onClick={() => setIsMasked(!isMasked)} title={isMasked ? '주민번호 표시' : '주민번호 숨기기'}>
              {isMasked ? <Eye size={18}/> : <EyeOff size={18}/>}
            </button>
            <button className="btn btn-primary" onClick={handlePrint} disabled={!selectedEmp}>
              <Printer size={18} style={{ marginRight:'6px' }}/> 원천징수부 인쇄
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:'24px' }}>
          {/* 직원 선택 */}
          <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 16px', background:'rgba(255,255,255,0.05)', fontWeight:'600', fontSize:'14px' }}>대상 근로자</div>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <input type="text" placeholder="이름 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ width:'100%', padding:'8px 12px', borderRadius:'6px', background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.1)', color:'white', fontSize:'13px', outline:'none' }}/>
            </div>
            <div style={{ maxHeight:'500px', overflowY:'auto' }}>
              {filteredEmployees.map(emp => (
                <div key={emp.id} onClick={() => setSelectedEmpId(emp.id)}
                  style={{ padding:'10px 16px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)', background: selectedEmpId === emp.id ? 'rgba(59,130,246,0.15)' : 'transparent', display:'flex', alignItems:'center', gap:'10px' }}>
                  <UserCircle size={18} style={{ color: selectedEmpId === emp.id ? '#60a5fa' : '#64748b' }}/>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:'500' }}>{emp.name}</div>
                    <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{emp.employment_type} · {emp.role || '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          <div className="glass-card" style={{ overflowX:'auto' }}>
            {!selectedEmp ? (
              <div style={{ padding:'80px 20px', textAlign:'center', color:'var(--text-secondary)' }}>
                <FileText size={48} style={{ marginBottom:'16px', opacity:0.3 }}/>
                <p>좌측에서 근로자를 선택하면 원천징수부가 생성됩니다.</p>
              </div>
            ) : (
              <div style={{ color:'#000', background:'#fff', padding:'30px', borderRadius:'8px', minWidth:'900px' }}>
                {renderForm(selectedEmp, targetYear, monthlyData, annualTotals, isMasked, fmt, B, cellBase, cellR, headerCell, company)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 인쇄 전용 ── */}
      {selectedEmp && (
        <div className="print-only" style={{ color:'#000', padding:'10mm', background:'#fff' }}>
          {renderForm(selectedEmp, targetYear, monthlyData, annualTotals, isMasked, fmt, B, cellBase, cellR, headerCell, company)}
        </div>
      )}

      <style>{`
        @media print {
          .withholding-ledger { @page { size: A4 landscape; margin: 8mm; } }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}

/* ══════ 법정 양식 렌더링 함수 ══════ */
function renderForm(emp, year, monthlyData, totals, isMasked, fmt, B, cellBase, cellR, headerCell, company) {
  const CI = company || COMPANY_INFO;
  return (
    <>
      <div style={{ textAlign:'center', marginBottom:'16px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'bold', letterSpacing:'6px' }}>근로소득 원천징수부</h1>
        <p style={{ fontSize:'11px', color:'#666', marginTop:'2px' }}>(소득세법 시행규칙 별지 제24호 서식(1))</p>
      </div>

      {/* 원천징수의무자 & 소득자 */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'10px' }}>
        <tbody>
          <tr>
            <td style={{ ...headerCell, width:'100px' }} rowSpan="2">원천징수<br/>의무자</td>
            <td style={{ ...headerCell, width:'80px' }}>법인명(상호)</td>
            <td style={{ ...cellBase, textAlign:'left', width:'200px' }}>{CI.name}</td>
            <td style={{ ...headerCell, width:'90px' }}>사업자등록번호</td>
            <td style={{ ...cellBase, width:'150px' }}>{CI.businessNumber}</td>
            <td style={{ ...headerCell, width:'70px' }} rowSpan="2">소득자</td>
            <td style={{ ...headerCell, width:'60px' }}>성 명</td>
            <td style={{ ...cellBase, width:'100px' }}>{emp.name}</td>
          </tr>
          <tr>
            <td style={headerCell}>대표자</td>
            <td style={{ ...cellBase, textAlign:'left' }}>{CI.representative || CI.ceoName}</td>
            <td style={headerCell}>주 소</td>
            <td style={{ ...cellBase, fontSize:'9px', textAlign:'left' }}>{CI.address}</td>
            <td style={headerCell}>주민등록번호</td>
            <td style={{ ...cellBase, fontSize:'11px', letterSpacing:'1px' }}>{formatResidentId(emp.birth_date, isMasked)}</td>
          </tr>
        </tbody>
      </table>

      {/* 소득자 추가 정보 */}
      <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'12px' }}>
        <tbody>
          <tr>
            <td style={{ ...headerCell, width:'100px' }}>근무기간</td>
            <td style={{ ...cellBase, textAlign:'left' }}>
              {emp.join_date} ~ {emp.resignation_date || `${year}-12-31`}
            </td>
            <td style={{ ...headerCell, width:'80px' }}>부양가족 수</td>
            <td style={{ ...cellBase, width:'60px' }}>{emp.dependents || 1}명</td>
            <td style={{ ...headerCell, width:'80px' }}>고용형태</td>
            <td style={{ ...cellBase, width:'80px' }}>{emp.employment_type}</td>
          </tr>
        </tbody>
      </table>

      {/* ───── 월별 원천징수 명세 테이블 ───── */}
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'10px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, width:'45px' }} rowSpan="2">지급<br/>월</th>
            <th style={headerCell} colSpan="4">지 급 액</th>
            <th style={headerCell} colSpan="4">사 회 보 험 료 (근로자 부담분)</th>
            <th style={headerCell} colSpan="2">세 액</th>
            <th style={{ ...headerCell, width:'90px' }} rowSpan="2">차감<br/>지급액</th>
          </tr>
          <tr>
            <th style={{ ...headerCell, width:'80px' }}>급여(과세)</th>
            <th style={{ ...headerCell, width:'70px' }}>상여등</th>
            <th style={{ ...headerCell, width:'65px' }}>비과세</th>
            <th style={{ ...headerCell, width:'85px' }}>과세소득계</th>
            <th style={{ ...headerCell, width:'65px' }}>국민연금</th>
            <th style={{ ...headerCell, width:'65px' }}>건강보험</th>
            <th style={{ ...headerCell, width:'60px' }}>장기요양</th>
            <th style={{ ...headerCell, width:'60px' }}>고용보험</th>
            <th style={{ ...headerCell, width:'65px' }}>소득세</th>
            <th style={{ ...headerCell, width:'60px' }}>지방소득세</th>
          </tr>
        </thead>
        <tbody>
          {monthlyData.map(m => (
            <tr key={m.month} style={{ background: m.exists ? '#fff' : '#fafafa' }}>
              <td style={cellBase}>{m.month}월</td>
              <td style={cellR}>{m.exists ? fmt(m.basePay) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.taxableExtras) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.taxFreeTotal) : ''}</td>
              <td style={{ ...cellR, fontWeight:'600' }}>{m.exists ? fmt(m.taxableTotal) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.np) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.hi) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.ltc) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.ei) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.it) : ''}</td>
              <td style={cellR}>{m.exists ? fmt(m.rt) : ''}</td>
              <td style={{ ...cellR, fontWeight:'600' }}>{m.exists ? fmt(m.netPay) : ''}</td>
            </tr>
          ))}
          {/* 합계 행 */}
          <tr style={{ background:'#e8f0fe', fontWeight:'bold' }}>
            <td style={cellBase}>합 계</td>
            <td style={cellR}>{fmt(totals.basePay)}</td>
            <td style={cellR}>{fmt(totals.taxableExtras)}</td>
            <td style={cellR}>{fmt(totals.taxFreeTotal)}</td>
            <td style={cellR}>{fmt(totals.taxableTotal)}</td>
            <td style={cellR}>{fmt(totals.np)}</td>
            <td style={cellR}>{fmt(totals.hi)}</td>
            <td style={cellR}>{fmt(totals.ltc)}</td>
            <td style={cellR}>{fmt(totals.ei)}</td>
            <td style={cellR}>{fmt(totals.it)}</td>
            <td style={cellR}>{fmt(totals.rt)}</td>
            <td style={cellR}>{fmt(totals.netPay)}</td>
          </tr>
        </tbody>
      </table>

      {/* 비과세 소득 명세 */}
      <div style={{ marginTop:'16px' }}>
        <table style={{ width:'50%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={headerCell} colSpan="3">비과세 소득 명세</th>
            </tr>
            <tr>
              <th style={{ ...headerCell, width:'40%' }}>항 목</th>
              <th style={{ ...headerCell, width:'30%' }}>소득코드</th>
              <th style={{ ...headerCell, width:'30%' }}>연간 합계</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const tfMap = {};
              monthlyData.filter(m => m.exists && m.taxFreeItems).forEach(m => {
                m.taxFreeItems.forEach(item => {
                  const key = item.name || '기타 비과세';
                  if (!tfMap[key]) tfMap[key] = 0;
                  tfMap[key] += Number(item.amount) || 0;
                });
              });
              const entries = Object.entries(tfMap);
              if (entries.length === 0) return <tr><td style={cellBase} colSpan="3">해당 없음</td></tr>;
              return entries.map(([name, total]) => (
                <tr key={name}>
                  <td style={{ ...cellBase, textAlign:'left', paddingLeft:'10px' }}>{name}</td>
                  <td style={cellBase}>{TAX_FREE_CODES[name]?.code || 'Q01'}</td>
                  <td style={cellR}>{total.toLocaleString()}</td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>

      {/* 하단 서명란 */}
      <div style={{ marginTop:'30px', display:'flex', justifyContent:'space-between', alignItems:'flex-end', padding:'0 20px' }}>
        <div style={{ fontSize:'11px', color:'#666' }}>
          ※ 본 원천징수부는 「소득세법」 제164조에 따라 작성된 법정 서류입니다.
        </div>
        <div style={{ textAlign:'center', position:'relative' }}>
          <p style={{ fontSize:'13px', marginBottom:'8px' }}>{CI.name}</p>
          <p style={{ fontSize:'13px' }}>대표이사 {CI.representative || CI.ceoName} (인)</p>
          {/* 직인 이미지 오버레이 */}
          {(CI.seal_url || CI.sealImagePath) && (
            <img src={CI.seal_url || CI.sealImagePath} alt="" style={{ position:'absolute', right:'-20px', bottom:'-10px', width:'70px', height:'70px', opacity:0.7 }} onError={e => { e.target.style.display = 'none'; }}/>
          )}
        </div>
      </div>
    </>
  );
}
