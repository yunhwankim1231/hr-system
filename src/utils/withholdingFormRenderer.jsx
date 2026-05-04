import React, { useState } from 'react';
import COMPANY_INFO from '../config/companyInfo';

export function fmtRID(birthDate, masked) {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return masked ? `${yy}${mm}${dd}-*******` : `${yy}${mm}${dd}-1234567`;
}

export const TF_CODES = {
  '식대': 'H01', '자가운전보조금': 'O01', '출산보육수당': 'G01',
  '연구활동비': 'M01', '야간근로수당': 'R10', '생산직야간수당': 'R11',
};

const fmt = v => (v || 0).toLocaleString();

/* 
  * [위치 좌표 설정]
  * PDF 이미지를 바탕으로 했을 때 데이터가 찍힐 % 좌표입니다.
  * top: 위에서부터의 거리(%), left: 왼쪽에서부터의 거리(%), w: 너비(%)
  * 값이 틀어질 경우 여기서 미세조정(0.1% 단위)하면 됩니다.
*/
let POS = {
  // 상단
  year: { top: 3.5, left: 91, w: 5 },
  isResident: { top: 12.1, left: 15, w: 2 },
  isDomestic: { top: 12.1, left: 36.5, w: 2 },
  
  // 원천징수의무자
  companyName: { top: 15.1, left: 19, w: 18 },
  bizNum: { top: 15.1, left: 51, w: 13 },
  ceoName: { top: 17.6, left: 19, w: 18 },
  corpNum: { top: 17.6, left: 51, w: 13 },
  companyAddr: { top: 20.0, left: 19, w: 45 },
  
  // 소득자
  empName: { top: 15.1, left: 79, w: 19 },
  empRid: { top: 17.6, left: 79, w: 19 },
  empAddr: { top: 20.0, left: 79, w: 19 },

  // Ⅰ. 근무처별 소득명세 (주근무지)
  joinDate: { top: 26.5, left: 12, w: 8 },
  resigDate: { top: 27.5, left: 12, w: 8 },
  pSalary: { top: 27.5, left: 21, w: 8 },    
  pBonus: { top: 27.5, left: 29.5, w: 8 },   
  pTotal: { top: 27.5, left: 80.5, w: 8 },   
  pTaxFree: { top: 27.5, left: 89, w: 9 },   

  // Ⅱ. 비과세
  tf1Code: { top: 35.5, left: 7, w: 5 },
  tf1Amt: { top: 35.5, left: 12.5, w: 9 },
  tf2Code: { top: 35.5, left: 21.5, w: 5 },
  tf2Amt: { top: 35.5, left: 27, w: 9 },
  tf3Code: { top: 35.5, left: 36.5, w: 5 },
  tf3Amt: { top: 35.5, left: 42, w: 9 },
  tfTotal: { top: 38.4, left: 51.5, w: 14 },

  // Ⅲ. 보험료
  np: { top: 62.2, left: 22, w: 10 },
  hi: { top: 62.2, left: 42, w: 10 },
  ltc: { top: 62.2, left: 62, w: 10 },
  ei: { top: 65.0, left: 22, w: 10 },

  // Ⅳ. 세액계산
  detIt: { top: 76.5, left: 43, w: 12 },    
  detRt: { top: 76.5, left: 60, w: 12 },    
  detTot: { top: 76.5, left: 77, w: 20 },   
  paidIt: { top: 79.5, left: 43, w: 12 },   
  paidRt: { top: 79.5, left: 60, w: 12 },   
  paidTot: { top: 79.5, left: 77, w: 20 },
  diffIt: { top: 86.8, left: 43, w: 12 },   
  diffRt: { top: 86.8, left: 60, w: 12 },   
  diffTot: { top: 86.8, left: 77, w: 20 },

  // 하단 날짜 & 직인
  signYear: { top: 92.5, left: 40, w: 5 },
  signMonth: { top: 92.5, left: 49, w: 3 },
  signDay: { top: 92.5, left: 55, w: 3 },
  seal: { top: 93.0, left: 68, w: 15 },
};

export function WithholdingFormPage1({ emp, data, isMasked, debug, setDebug, company }) {
  const CI = company || COMPANY_INFO;
  const endDate = emp.resignation_date || `${data.year}-12-31`;
  const tfEntries = Object.entries(data.tfMap || {});
  const [positions, setPositions] = React.useState(POS);

  const handleDragEnd = (e, posKey) => {
    const rect = e.target.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let leftPct = (x / rect.width) * 100;
    let topPct = (y / rect.height) * 100;
    
    setPositions(prev => ({
      ...prev,
      [posKey]: { ...prev[posKey], top: topPct.toFixed(1), left: leftPct.toFixed(1) }
    }));
  };

  const Val = ({ posKey, val, align = 'center', fontSize = '11px', weight = 'normal' }) => {
    const p = positions[posKey];
    if (!p) return null;
    return (
      <div
        draggable={debug}
        onDragEnd={(e) => handleDragEnd(e, posKey)}
        style={{
          position: 'absolute',
          top: `${p.top}%`,
          left: `${p.left}%`,
          width: `${p.w}%`,
          textAlign: align,
          fontSize: fontSize,
          fontWeight: weight,
          color: debug ? '#ef4444' : '#000',
          transform: 'translate(-50%, -50%)',
          border: debug ? '1px dashed red' : 'none',
          background: debug ? 'rgba(255,255,255,0.8)' : 'transparent',
          whiteSpace: 'nowrap',
          overflow: 'visible',
          cursor: debug ? 'move' : 'default',
          zIndex: debug ? 10 : 1,
          padding: debug ? '2px' : 0,
        }}>
        {val || '(빈값)'}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      
      {/* 디버그 툴바 */}
      <div className="no-print" style={{ textAlign: 'right', marginBottom: '10px' }}>
        <button onClick={() => setDebug(!debug)} style={{ padding: '6px 12px', fontSize: '13px', background: debug ? '#ef4444' : '#475569', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {debug ? '위치 편집 모드 종료' : '직접 위치 편집하기 (드래그)'}
        </button>
      </div>

      {debug && (
        <div className="no-print" style={{ background: '#f8fafc', color: '#000', padding: '16px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto' }}>
          <strong>새로운 위치 설정값 (복사해서 개발자에게 전달해주세요):</strong>
          <pre style={{ color: '#000' }}>{JSON.stringify(positions, null, 2)}</pre>
        </div>
      )}

      {/* A4 비율의 컨테이너 */}
      <div id="receipt-container" style={{ 
        position: 'relative', 
        width: '100%', 
        aspectRatio: '210 / 297',
        backgroundImage: "url('/receipt_bg.png')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center top',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)'
      }}>
        
        {/* 상단 */}
        <Val posKey="year" val={data.year} />
        <Val posKey="isResident" val="V" weight="bold" />
        <Val posKey="isDomestic" val="V" weight="bold" />

        {/* 원천징수의무자 */}
        <Val posKey="companyName" val={CI.name} align="left" />
        <Val posKey="bizNum" val={CI.businessNumber} />
        <Val posKey="ceoName" val={CI.representative || CI.ceoName} align="left" />
        <Val posKey="corpNum" val={CI.corporateNumber || '-'} />
        <Val posKey="companyAddr" val={CI.address} align="left" fontSize="9px" />

        {/* 소득자 */}
        <Val posKey="empName" val={emp.name} weight="bold" />
        <Val posKey="empRid" val={fmtRID(emp.birth_date, isMasked)} fontSize="10px" />
        <Val posKey="empAddr" val={emp.address || '-'} align="left" fontSize="9px" />

        {/* Ⅰ. 소득명세 */}
        <Val posKey="joinDate" val={emp.join_date} fontSize="9px" />
        <Val posKey="resigDate" val={`~${endDate}`} fontSize="9px" />
        <Val posKey="pSalary" val={fmt(data.salary)} align="right" />
        <Val posKey="pBonus" val={fmt(data.bonus)} align="right" />
        <Val posKey="pTotal" val={fmt(data.totalPay)} align="right" weight="bold" />
        <Val posKey="pTaxFree" val={fmt(data.taxFreeSum)} align="right" weight="bold" />

        {/* Ⅱ. 비과세 */}
        <Val posKey="tf1Code" val={tfEntries[0] ? (TF_CODES[tfEntries[0][0]] || 'Q01') : ''} />
        <Val posKey="tf1Amt" val={tfEntries[0] ? fmt(tfEntries[0][1]) : ''} align="right" />
        <Val posKey="tf2Code" val={tfEntries[1] ? (TF_CODES[tfEntries[1][0]] || 'Q01') : ''} />
        <Val posKey="tf2Amt" val={tfEntries[1] ? fmt(tfEntries[1][1]) : ''} align="right" />
        <Val posKey="tf3Code" val={tfEntries[2] ? (TF_CODES[tfEntries[2][0]] || 'Q01') : ''} />
        <Val posKey="tf3Amt" val={tfEntries[2] ? fmt(tfEntries[2][1]) : ''} align="right" />
        <Val posKey="tfTotal" val={fmt(data.taxFreeSum)} align="right" weight="bold" />

        {/* Ⅲ. 보험료 */}
        <Val posKey="np" val={fmt(data.np)} align="right" />
        <Val posKey="hi" val={fmt(data.hi)} align="right" />
        <Val posKey="ltc" val={fmt(data.ltc)} align="right" />
        <Val posKey="ei" val={fmt(data.ei)} align="right" />

        {/* Ⅳ. 세액 */}
        <Val posKey="detIt" val={fmt(data.it)} align="right" />
        <Val posKey="detRt" val={fmt(data.rt)} align="right" />
        <Val posKey="detTot" val={fmt(data.it + data.rt)} align="right" weight="bold" />
        
        <Val posKey="paidIt" val={fmt(data.it)} align="right" />
        <Val posKey="paidRt" val={fmt(data.rt)} align="right" />
        <Val posKey="paidTot" val={fmt(data.it + data.rt)} align="right" weight="bold" />
        
        <Val posKey="diffIt" val="0" align="right" weight="bold" />
        <Val posKey="diffRt" val="0" align="right" weight="bold" />
        <Val posKey="diffTot" val="0" align="right" weight="bold" />

        {/* 하단 서명 */}
        <Val posKey="signYear" val={new Date().getFullYear()} />
        <Val posKey="signMonth" val={new Date().getMonth() + 1} />
        <Val posKey="signDay" val={new Date().getDate()} />
        
        <div style={{
          position: 'absolute', top: `${POS.seal.top}%`, left: `${POS.seal.left}%`,
          width: '70px', height: '70px', transform: 'translateY(-50%)', opacity: 0.6
        }}>
          <img src={CI.seal_url || CI.sealImagePath} alt="직인" style={{ width: '100%', height: '100%' }} onError={e => { e.target.style.display = 'none'; }} />
        </div>

      </div>
    </div>
  );
}
