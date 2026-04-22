import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import COMPANY_INFO from '../config/companyInfo';
import { Printer, FileCheck, UserCircle, Calendar, Eye, EyeOff } from 'lucide-react';

/* ─── 주민번호 헬퍼 ─── */
function fmtRID(birthDate, masked) {
  if (!birthDate) return '-';
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return masked ? `${yy}${mm}${dd}-*******` : `${yy}${mm}${dd}-1234567`;
}

/* ─── 비과세 코드표 ─── */
const TF_CODES = {
  '식대': 'H01', '자가운전보조금': 'O01', '출산보육수당': 'G01',
  '연구활동비': 'M01', '야간근로수당': 'R10', '생산직야간수당': 'R11',
};

/* ─── 금액 포맷 ─── */
const fmt = v => (v || 0).toLocaleString();

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

  /* ── 연간 데이터 집계 ── */
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
      const base = ed.earnings.find(e => e.id === 'base')?.amount || 0;
      const extras = ed.earnings.filter(e => e.id !== 'base' && !e.isTaxFree).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const tfItems = ed.earnings.filter(e => e.isTaxFree);
      salary += base;
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
    return { months, salary, bonus, taxFreeSum, totalPay, np, hi, ltc, ei, ins, it, rt, tfMap };
  }, [selectedEmpId, targetYear, payrollArchives]);

  const handlePrint = useCallback(() => {
    setIsMasked(false);
    setTimeout(() => { window.print(); setTimeout(() => setIsMasked(true), 500); }, 100);
  }, []);

  const years = [...new Set([...payrollArchives.map(p => p.year), new Date().getFullYear()])].sort((a, b) => b - a);

  /* ══════ 법정 양식 테이블 스타일 ══════ */
  const BD = '1px solid #000';
  const th = { border: BD, padding: '3px 4px', fontSize: '10px', textAlign: 'center', background: '#f5f5f5', fontWeight: '600', verticalAlign: 'middle' };
  const td = { border: BD, padding: '3px 6px', fontSize: '10px', textAlign: 'center', verticalAlign: 'middle' };
  const tdR = { ...td, textAlign: 'right', paddingRight: '8px' };
  const tdL = { ...td, textAlign: 'left', paddingLeft: '8px' };
  const secHdr = { border: BD, padding: '4px', fontSize: '11px', fontWeight: 'bold', textAlign: 'center', background: '#e8e8e8' };

  /* ══════ 양식 본문 (화면+인쇄 공용) ══════ */
  const renderReceipt = () => {
    if (!selectedEmp || !data) return null;
    const CI = COMPANY_INFO;
    const emp = selectedEmp;
    const endDate = emp.resignation_date || `${targetYear}-12-31`;

    return (
      <div style={{ color: '#000', background: '#fff', padding: '24px 28px', fontFamily: "'Malgun Gothic', 'Noto Sans KR', sans-serif", maxWidth: '210mm' }}>
        {/* 제목 */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
          <div style={{ fontSize: '9px', color: '#555', marginBottom: '2px' }}>
            [별지 제24호서식(1)] &lt;개정 2021.3.16.&gt;
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '10px', margin: '4px 0' }}>근로소득 원천징수영수증</h1>
          <div style={{ fontSize: '9px', textAlign: 'right' }}>(소득세법 시행규칙) {targetYear}년 귀속</div>
        </div>

        {/* ═══ 1. 원천징수의무자 · 소득자 인적사항 ═══ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ ...th, width: '70px' }} rowSpan="3">원천징수<br/>의무자</td>
              <td style={{ ...th, width: '70px' }}>(1)법인명(상호)</td>
              <td style={{ ...tdL, width: '160px' }}>{CI.name}</td>
              <td style={{ ...th, width: '80px' }}>(2)사업자등록번호</td>
              <td style={td}>{CI.businessNumber}</td>
              <td style={{ ...th, width: '50px' }} rowSpan="3">소득자</td>
              <td style={{ ...th, width: '60px' }}>(7)성 명</td>
              <td style={td}>{emp.name}</td>
            </tr>
            <tr>
              <td style={th}>(3)대표자(성명)</td>
              <td style={tdL}>{CI.ceoName}</td>
              <td style={th}>(4)주민(법인)등록번호</td>
              <td style={td}>{CI.corporateNumber}</td>
              <td style={th}>(8)주민등록번호</td>
              <td style={{ ...td, letterSpacing: '1px', fontSize: '11px', fontWeight: '500' }}>{fmtRID(emp.birth_date, isMasked)}</td>
            </tr>
            <tr>
              <td style={th}>(5)소재지(주소)</td>
              <td style={{ ...tdL, fontSize: '9px' }} colSpan="3">{CI.address}</td>
              <td style={th}>(9)주 소</td>
              <td style={{ ...tdL, fontSize: '9px' }}>{emp.address || '-'}</td>
            </tr>
          </tbody>
        </table>

        {/* 부가정보 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <tbody>
            <tr>
              <td style={th}>(10)거주구분</td>
              <td style={td}>거주자</td>
              <td style={th}>(11)내·외국인</td>
              <td style={td}>내국인</td>
              <td style={th}>(12)세대주 여부</td>
              <td style={td}>{(emp.dependents || 1) >= 1 ? '세대주' : '세대원'}</td>
              <td style={th}>부양가족 수</td>
              <td style={td}>{emp.dependents || 1}명</td>
            </tr>
          </tbody>
        </table>

        {/* ═══ Ⅰ. 근무처별 소득명세 ═══ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr><td style={secHdr} colSpan="8">Ⅰ. 근무처별 소득명세</td></tr>
            <tr>
              <th style={th}>구 분</th>
              <th style={th}>근무기간</th>
              <th style={th}>(13)급 여</th>
              <th style={th}>(14)상여 등</th>
              <th style={th}>(15)인정상여</th>
              <th style={th}>(16)주식매수선택권<br/>행사이익</th>
              <th style={th}>(20)계</th>
              <th style={th}>(21)비과세소득 계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={th}>주(현)<br/>근무지</td>
              <td style={td}>{emp.join_date}<br/>~ {endDate}</td>
              <td style={tdR}>{fmt(data.salary)}</td>
              <td style={tdR}>{fmt(data.bonus)}</td>
              <td style={tdR}>0</td>
              <td style={tdR}>0</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.totalPay)}</td>
              <td style={tdR}>{fmt(data.taxFreeSum)}</td>
            </tr>
            <tr style={{ background: '#f9f9f9' }}>
              <td style={{ ...th, fontWeight: 'bold' }}>계</td>
              <td style={td}>({data.months}개월)</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.salary)}</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.bonus)}</td>
              <td style={tdR}>0</td>
              <td style={tdR}>0</td>
              <td style={{ ...tdR, fontWeight: 'bold', fontSize: '12px' }}>{fmt(data.totalPay)}</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.taxFreeSum)}</td>
            </tr>
          </tbody>
        </table>

        {/* ═══ Ⅱ. 비과세 및 감면소득 명세 ═══ */}
        <table style={{ width: '60%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr><td style={secHdr} colSpan="4">Ⅱ. 비과세 및 감면소득 명세</td></tr>
            <tr>
              <th style={{ ...th, width: '30px' }}>순번</th>
              <th style={{ ...th, width: '120px' }}>소득 항목</th>
              <th style={{ ...th, width: '60px' }}>코 드</th>
              <th style={{ ...th, width: '100px' }}>금 액</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const entries = Object.entries(data.tfMap);
              if (entries.length === 0) {
                return <tr><td style={td} colSpan="4">해당 사항 없음</td></tr>;
              }
              return entries.map(([name, total], i) => (
                <tr key={name}>
                  <td style={td}>{i + 1}</td>
                  <td style={tdL}>{name}</td>
                  <td style={td}>{TF_CODES[name] || 'Q01'}</td>
                  <td style={tdR}>{total.toLocaleString()}</td>
                </tr>
              ));
            })()}
            <tr style={{ background: '#f9f9f9' }}>
              <td style={th} colSpan="3">비과세소득 합계</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.taxFreeSum)}</td>
            </tr>
          </tbody>
        </table>

        {/* ═══ Ⅲ-1. 사회보험료 공제 ═══ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
          <thead>
            <tr><td style={secHdr} colSpan="6">Ⅲ. 사회보험료 공제 (근로자 부담분)</td></tr>
          </thead>
          <tbody>
            <tr>
              <td style={th}>(22)국민연금</td><td style={tdR}>{fmt(data.np)}</td>
              <td style={th}>(23)건강보험</td><td style={tdR}>{fmt(data.hi)}</td>
              <td style={th}>(24)장기요양보험</td><td style={tdR}>{fmt(data.ltc)}</td>
            </tr>
            <tr>
              <td style={th}>(25)고용보험</td><td style={tdR}>{fmt(data.ei)}</td>
              <td style={{ ...th, fontWeight: 'bold' }}>보험료 합계</td>
              <td style={{ ...tdR, fontWeight: 'bold', fontSize: '12px' }} colSpan="3">{fmt(data.ins)}</td>
            </tr>
          </tbody>
        </table>

        {/* ═══ Ⅳ. 세액의 계산 ═══ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
          <thead>
            <tr><td style={secHdr} colSpan="4">Ⅳ. 세액의 계산</td></tr>
            <tr>
              <th style={{ ...th, width: '35%' }}>구 분</th>
              <th style={{ ...th, width: '22%' }}>소 득 세</th>
              <th style={{ ...th, width: '22%' }}>지방소득세</th>
              <th style={{ ...th, width: '21%' }}>합 계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={th}>(70) 결정세액</td>
              <td style={tdR}>{fmt(data.it)}</td>
              <td style={tdR}>{fmt(data.rt)}</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.it + data.rt)}</td>
            </tr>
            <tr>
              <td style={th}>(71) 기납부세액 (매월 원천징수 합계)</td>
              <td style={tdR}>{fmt(data.it)}</td>
              <td style={tdR}>{fmt(data.rt)}</td>
              <td style={{ ...tdR, fontWeight: 'bold' }}>{fmt(data.it + data.rt)}</td>
            </tr>
            <tr style={{ background: '#fffde7' }}>
              <td style={{ ...th, fontSize: '12px', fontWeight: 'bold' }}>(72) 차감징수세액 (⑥-⑦)<br/>
                <span style={{ fontSize: '9px', fontWeight: 'normal' }}>양수: 추가징수 / 음수(△): 환급</span>
              </td>
              <td style={{ ...tdR, fontSize: '14px', fontWeight: 'bold' }}>0</td>
              <td style={{ ...tdR, fontSize: '14px', fontWeight: 'bold' }}>0</td>
              <td style={{ ...tdR, fontSize: '16px', fontWeight: 'bold' }}>0</td>
            </tr>
          </tbody>
        </table>

        {/* ═══ 하단 서명 + 직인 ═══ */}
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', lineHeight: '2' }}>
          <p>위의 원천징수영수증(지급조서)을 「소득세법」 제143조 및 같은 법 시행령 제213조에 의하여 발급합니다.</p>
          <p style={{ marginTop: '16px', fontSize: '13px' }}>
            {new Date().getFullYear()}년 {String(new Date().getMonth() + 1).padStart(2, '0')}월 {String(new Date().getDate()).padStart(2, '0')}일
          </p>
          <div style={{ marginTop: '24px', position: 'relative', display: 'inline-block' }}>
            <p style={{ fontSize: '13px' }}>징수의무자 &nbsp; {CI.name}</p>
            <p style={{ fontSize: '13px' }}>대표이사 &nbsp; {CI.ceoName} &nbsp; (인)</p>
            <img
              src={CI.sealImagePath} alt=""
              style={{ position: 'absolute', right: '-35px', bottom: '-20px', width: '80px', height: '80px', opacity: 0.65 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
          <p style={{ marginTop: '30px', fontSize: '9px', color: '#888' }}>
            세무서장 · 지방국세청장 · 국세청장 귀하
          </p>
        </div>
      </div>
    );
  };

  /* ══════ 페이지 렌더링 ══════ */
  return (
    <div className="withholding-receipt">
      <div className="no-print">
        {/* 상단 제어 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileCheck size={28} style={{ color: '#a78bfa' }}/> 근로소득 원천징수영수증
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              소득세법 시행규칙 [별지 제24호 서식(1)] · 개정 2021.3.16 · 결정세액/기납부세액/차감징수세액 포함
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

        {/* 본문 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
          {/* 좌측: 직원 목록 */}
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

          {/* 우측: 양식 미리보기 */}
          <div className="glass-card" style={{ overflowX: 'auto', padding: '16px' }}>
            {!selectedEmp ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileCheck size={48} style={{ marginBottom: '16px', opacity: 0.3 }}/>
                <p>좌측에서 근로자를 선택하면<br/>원천징수영수증이 생성됩니다.</p>
              </div>
            ) : !data || data.months === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p><strong>{selectedEmp.name}</strong>님의 {targetYear}년도 마감 급여 기록이 없습니다.</p>
              </div>
            ) : (
              <div style={{ borderRadius: '4px', border: '1px solid #ddd', overflow: 'hidden' }}>
                {renderReceipt()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 인쇄 전용 */}
      {selectedEmp && data && data.months > 0 && (
        <div className="print-only" style={{ padding: '10mm', background: '#fff' }}>
          {renderReceipt()}
        </div>
      )}

      <style>{`
        @media print {
          .withholding-receipt .print-only { display: block !important; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
        }
        .print-only { display: none; }
      `}</style>
    </div>
  );
}
