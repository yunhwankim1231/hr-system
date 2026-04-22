import COMPANY_INFO from '../config/companyInfo';

/* 주민번호 포맷 */
export function fmtRID(birthDate, masked) {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return masked ? `${yy}${mm}${dd}-*******` : `${yy}${mm}${dd}-1234567`;
}

/* 비과세 코드표 */
export const TF_CODES = {
  '식대': 'H01', '자가운전보조금': 'O01', '출산보육수당': 'G01',
  '연구활동비': 'M01', '야간근로수당': 'R10', '생산직야간수당': 'R11',
};

const fmt = v => (v || 0).toLocaleString();

/* ═══ 스타일 상수 (법정 양식 모방) ═══ */
const BD = '1px solid #000';
const BDT = '2px solid #000';
const base = { border: BD, padding: '2px 3px', fontSize: '8.5px', textAlign: 'center', verticalAlign: 'middle', lineHeight: '1.3' };
const hd = { ...base, background: '#f2f2f2', fontWeight: '600' };
const R = { ...base, textAlign: 'right', paddingRight: '4px' };
const L = { ...base, textAlign: 'left', paddingLeft: '4px' };
const secTitle = { ...base, background: '#e0e0e0', fontWeight: 'bold', fontSize: '9.5px', textAlign: 'left', paddingLeft: '6px' };

/**
 * 법정 양식 제1쪽 렌더링
 */
export function renderPage1(emp, data, isMasked) {
  const CI = COMPANY_INFO;
  const endDate = emp.resignation_date || `${data.year}-12-31`;
  const tfEntries = Object.entries(data.tfMap || {});

  return (
    <div style={{ width: '190mm', margin: '0 auto', fontFamily: "'Malgun Gothic', sans-serif", color: '#000', background: '#fff', padding: '8mm 10mm', boxSizing: 'border-box' }}>
      
      {/* ── 양식 번호 + 제목 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <span style={{ fontSize: '8px', color: '#555' }}>[별지 제24호서식(1)] &lt;개정 2021.3.16.&gt;</span>
        <span style={{ fontSize: '8px', color: '#555' }}>( {data.year}년 귀속 )</span>
      </div>

      <div style={{ textAlign: 'center', borderTop: BDT, borderBottom: BDT, padding: '5px 0', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '12px' }}>근로소득 원천징수영수증</span>
        <span style={{ fontSize: '9px', marginLeft: '10px' }}>(근로소득지급조서)</span>
      </div>

      {/* ── 체크박스 행 ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody><tr>
          <td style={{ ...hd, width: '15%' }}>거주구분</td>
          <td style={{ ...base, width: '10%' }}>☑ 거주자</td>
          <td style={{ ...hd, width: '15%' }}>내·외국인</td>
          <td style={{ ...base, width: '10%' }}>☑ 내국인</td>
          <td style={{ ...hd, width: '15%' }}>종교인 여부</td>
          <td style={{ ...base, width: '10%' }}>☐ 종교인</td>
          <td style={{ ...hd, width: '15%' }}>연말정산구분</td>
          <td style={{ ...base, width: '10%' }}>계속근로</td>
        </tr></tbody>
      </table>

      {/* ═══ 원천징수의무자 + 소득자 ═══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={{ ...hd, width: '55px' }} rowSpan="3">원천징수<br/>의무자</td>
            <td style={{ ...hd, width: '75px' }}>①법인명(상호)</td>
            <td style={{ ...L, minWidth: '120px' }}>{CI.name}</td>
            <td style={{ ...hd, width: '85px' }}>②사업자등록번호</td>
            <td style={base}>{CI.businessNumber}</td>
            <td style={{ ...hd, width: '45px' }} rowSpan="3">소득자</td>
            <td style={{ ...hd, width: '55px' }}>⑥성 명</td>
            <td style={{ ...base, fontWeight: '600' }}>{emp.name}</td>
          </tr>
          <tr>
            <td style={hd}>③대표자(성명)</td>
            <td style={L}>{CI.ceoName}</td>
            <td style={hd}>④주민(법인)<br/>등록번호</td>
            <td style={base}>{CI.corporateNumber}</td>
            <td style={hd}>⑦주민등록번호</td>
            <td style={{ ...base, letterSpacing: '1px', fontSize: '9px' }}>{fmtRID(emp.birth_date, isMasked)}</td>
          </tr>
          <tr>
            <td style={hd}>⑤주 소</td>
            <td style={{ ...L, fontSize: '7.5px' }} colSpan="3">{CI.address}</td>
            <td style={hd}>⑧주 소</td>
            <td style={{ ...L, fontSize: '7.5px' }}>{emp.address || '-'}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ Ⅰ. 근무처별 소득명세 ═══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <thead>
          <tr><td style={secTitle} colSpan="10">Ⅰ. 근무처별 소득명세</td></tr>
          <tr>
            <th style={{ ...hd, width: '50px' }}>구 분</th>
            <th style={hd}>근무기간</th>
            <th style={hd}>⑨급 여</th>
            <th style={hd}>⑩상여 등</th>
            <th style={hd}>⑪인정상여</th>
            <th style={hd}>⑫주식매수<br/>선택권</th>
            <th style={hd}>⑬우리사주<br/>조합인출금</th>
            <th style={hd}>⑭임원퇴직소득<br/>한도초과액</th>
            <th style={hd}>⑮직무발명<br/>보상금</th>
            <th style={{ ...hd, fontWeight: 'bold' }}>⑯계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={hd}>주(현)<br/>근무지</td>
            <td style={{ ...base, fontSize: '8px' }}>{emp.join_date}<br/>~{endDate}</td>
            <td style={R}>{fmt(data.salary)}</td>
            <td style={R}>{fmt(data.bonus)}</td>
            <td style={R}></td>
            <td style={R}></td>
            <td style={R}></td>
            <td style={R}></td>
            <td style={R}></td>
            <td style={{ ...R, fontWeight: 'bold' }}>{fmt(data.totalPay)}</td>
          </tr>
          <tr><td style={hd}>종(전)<br/>근무지</td><td style={base}></td><td style={R}></td><td style={R}></td><td style={R}></td><td style={R}></td><td style={R}></td><td style={R}></td><td style={R}></td><td style={R}></td></tr>
        </tbody>
      </table>

      {/* ═══ Ⅱ. 비과세 및 감면소득 명세 ═══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <thead>
          <tr><td style={secTitle} colSpan="8">Ⅱ. 비과세 및 감면소득 명세</td></tr>
          <tr>
            <th style={{ ...hd }} colSpan="6">비과세소득</th>
            <th style={hd} colSpan="2">감면소득</th>
          </tr>
          <tr>
            <th style={hd}>⑰코드</th><th style={hd}>금 액</th>
            <th style={hd}>코드</th><th style={hd}>금 액</th>
            <th style={hd}>코드</th><th style={hd}>금 액</th>
            <th style={hd}>코드</th><th style={hd}>금 액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {[0, 1, 2].map(i => {
              const entry = tfEntries[i];
              return (<React.Fragment key={i}>
                <td style={base}>{entry ? (TF_CODES[entry[0]] || 'Q01') : ''}</td>
                <td style={R}>{entry ? fmt(entry[1]) : ''}</td>
              </React.Fragment>);
            })}
            <td style={base}></td><td style={R}></td>
          </tr>
          <tr>
            <td style={{ ...hd }} colSpan="5">⑳ 비과세소득 계</td>
            <td style={{ ...R, fontWeight: 'bold' }}>{fmt(data.taxFreeSum)}</td>
            <td style={hd}>㉑ 감면소득 계</td>
            <td style={R}>0</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ Ⅲ. 소득공제 (간략) ═══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <thead><tr><td style={secTitle} colSpan="6">Ⅲ. 종합소득 과세표준 (간이)</td></tr></thead>
        <tbody>
          <tr>
            <td style={hd}>총 급여</td><td style={R}>{fmt(data.totalPay)}</td>
            <td style={hd}>(-) 비과세소득</td><td style={R}>{fmt(data.taxFreeSum)}</td>
            <td style={hd}>과세대상 급여</td><td style={{ ...R, fontWeight: 'bold' }}>{fmt(data.totalPay - data.taxFreeSum)}</td>
          </tr>
          <tr>
            <td style={hd}>(22)국민연금</td><td style={R}>{fmt(data.np)}</td>
            <td style={hd}>(23)건강보험+장기요양</td><td style={R}>{fmt(data.hi + data.ltc)}</td>
            <td style={hd}>(24)고용보험</td><td style={R}>{fmt(data.ei)}</td>
          </tr>
          <tr>
            <td style={{ ...hd, fontWeight: 'bold' }} colSpan="4">보험료 공제 합계</td>
            <td style={{ ...R, fontWeight: 'bold', fontSize: '10px' }} colSpan="2">{fmt(data.ins)}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ Ⅳ. 세액의 계산 ═══ */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', borderTop: BDT }}>
        <thead>
          <tr><td style={{ ...secTitle, borderTop: BDT }} colSpan="4">Ⅳ. 세액의 계산</td></tr>
          <tr>
            <th style={{ ...hd, width: '40%' }}>구 분</th>
            <th style={{ ...hd, width: '20%' }}>소 득 세</th>
            <th style={{ ...hd, width: '20%' }}>지방소득세</th>
            <th style={{ ...hd, width: '20%' }}>합 계</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={hd}>(72) 결정세액</td>
            <td style={R}>{fmt(data.it)}</td>
            <td style={R}>{fmt(data.rt)}</td>
            <td style={{ ...R, fontWeight: 'bold' }}>{fmt(data.it + data.rt)}</td>
          </tr>
          <tr>
            <td style={hd}>(73) 주(현)근무지 기납부세액</td>
            <td style={R}>{fmt(data.it)}</td>
            <td style={R}>{fmt(data.rt)}</td>
            <td style={{ ...R, fontWeight: 'bold' }}>{fmt(data.it + data.rt)}</td>
          </tr>
          <tr>
            <td style={hd}>(74) 종(전)근무지 기납부세액</td>
            <td style={R}>0</td><td style={R}>0</td><td style={R}>0</td>
          </tr>
          <tr>
            <td style={hd}>(75) 납부특례세액</td>
            <td style={R}>0</td><td style={R}>0</td><td style={R}>0</td>
          </tr>
          <tr style={{ background: '#fffde7' }}>
            <td style={{ ...hd, fontSize: '10px', fontWeight: 'bold', borderTop: BDT, borderBottom: BDT }}>
              (76) 차감징수세액<br/>
              <span style={{ fontSize: '7.5px', fontWeight: 'normal' }}>(72)-(73)-(74)-(75) &nbsp; 양수:추가징수 / 음수(△):환급</span>
            </td>
            <td style={{ ...R, fontSize: '12px', fontWeight: 'bold', borderTop: BDT, borderBottom: BDT }}>0</td>
            <td style={{ ...R, fontSize: '12px', fontWeight: 'bold', borderTop: BDT, borderBottom: BDT }}>0</td>
            <td style={{ ...R, fontSize: '14px', fontWeight: 'bold', borderTop: BDT, borderBottom: BDT }}>0</td>
          </tr>
        </tbody>
      </table>

      {/* ── 하단: 발급문구 + 서명 ── */}
      <div style={{ textAlign: 'center', fontSize: '9px', lineHeight: '2', marginTop: '10px' }}>
        <p>위의 원천징수영수증(지급조서)을 「소득세법」 제143조 및 같은 법 시행령 제213조에 의하여 발급합니다.</p>
        <p style={{ fontSize: '11px', marginTop: '12px' }}>
          {new Date().getFullYear()}년 &nbsp; {String(new Date().getMonth() + 1).padStart(2, '0')}월 &nbsp; {String(new Date().getDate()).padStart(2, '0')}일
        </p>
        <div style={{ marginTop: '16px', position: 'relative', display: 'inline-block' }}>
          <p style={{ fontSize: '11px' }}>징수의무자 &nbsp;&nbsp; {CI.name}</p>
          <p style={{ fontSize: '11px' }}>대표이사 &nbsp;&nbsp; {CI.ceoName} &nbsp; (인)</p>
          <img src={CI.sealImagePath} alt="" style={{ position: 'absolute', right: '-30px', bottom: '-15px', width: '70px', height: '70px', opacity: 0.6 }} onError={e => { e.target.style.display = 'none'; }}/>
        </div>
        <p style={{ marginTop: '20px', fontSize: '8px', color: '#888' }}>세무서장 · 지방국세청장 · 국세청장 귀하</p>
      </div>
    </div>
  );
}
