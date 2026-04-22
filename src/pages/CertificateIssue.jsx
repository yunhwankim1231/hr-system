import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { FileText, Printer, Stamp } from 'lucide-react';

export default function CertificateIssue() {
  const { company, employees, certificates, addCertificate } = useAppContext();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [certType, setCertType] = useState('employment'); // employment | career
  const [purpose, setPurpose] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [position, setPosition] = useState('');
  const [role, setRole] = useState('');
  const [customSeal, setCustomSeal] = useState(localStorage.getItem('customSeal') || '');
  const [showPreview, setShowPreview] = useState(false);

  const activeEmployees = employees.filter(e => !e.resignation_date);
  const allEmployees = employees;
  const targetList = certType === 'career' ? allEmployees : activeEmployees;
  const selectedEmp = employees.find(e => e.id === selectedEmpId);

  // 직원 선택 시 기본 직책/직무 자동 세팅
  React.useEffect(() => {
    if (selectedEmp) {
      setPosition(selectedEmp.position || '');
      setRole(selectedEmp.role || '');
    } else {
      setPosition('');
      setRole('');
    }
  }, [selectedEmp]);

  const handleGenerate = () => {
    if (!selectedEmpId) return alert('직원을 선택해주세요.');
    if (!purpose) return alert('용도를 입력해주세요.');
    
    // 발급 기록 저장
    addCertificate({
      empName: selectedEmp.name,
      type: certType === 'employment' ? '재직증명서' : '경력증명서',
      purpose,
      issueDate
    });

    setShowPreview(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // 재직(경력) 기간 계산
  const getWorkPeriod = (emp) => {
    const start = new Date(emp.join_date);
    const end = emp.resignation_date ? new Date(emp.resignation_date) : new Date();
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    let totalMonths = years * 12 + months;
    if (totalMonths < 0) totalMonths = 0;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return `${y > 0 ? `${y}년 ` : ''}${m}개월`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const certTitle = certType === 'employment' ? '재 직 증 명 서' : '경 력 증 명 서';
  const certTitleEn = certType === 'employment' ? 'Certificate of Employment' : 'Certificate of Career';

  return (
    <div className="certificate-issue">
      {/* ========== 화면 UI (인쇄 시 숨김) ========== */}
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stamp size={24} /> 증명서 발급
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              재직증명서 및 경력증명서를 자동 생성하고 인쇄합니다. 회사명은 <strong>{company.name}</strong>으로 출력됩니다.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
          {/* 왼쪽: 입력 폼 */}
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-color)' }}>발급 정보 입력</h3>

            {/* 증명서 유형 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>증명서 유형</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { setCertType('employment'); setSelectedEmpId(''); }}
                  className={certType === 'employment' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ flex: 1 }}
                >
                  📄 재직증명서
                </button>
                <button
                  onClick={() => { setCertType('career'); setSelectedEmpId(''); }}
                  className={certType === 'career' ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ flex: 1 }}
                >
                  📋 경력증명서
                </button>
              </div>
            </div>

            {/* 직원 선택 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>대상 직원</label>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                style={inputStyle}
              >
                <option value="" style={{ background: '#0f172a' }}>-- 직원을 선택하세요 --</option>
                {targetList.map(emp => (
                  <option key={emp.id} value={emp.id} style={{ background: '#0f172a', color: 'white' }}>
                    {emp.name} ({emp.employment_type}) {emp.resignation_date ? '(퇴사)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 용도 선택/입력 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>발급 용도</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['은행 제출용', '관공서 제출용', '비자 신청용', '기타'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPurpose(p === '기타' ? '' : p)}
                    className="btn btn-outline"
                    style={{
                      fontSize: '13px', padding: '6px 12px',
                      background: purpose === p ? 'var(--primary-color)' : 'transparent',
                      color: purpose === p ? 'white' : 'var(--text-secondary)',
                      border: purpose === p ? '1px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.15)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="직접 입력 또는 위 버튼 선택"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>발급일</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>직책 (수정 가능)</label>
                <input type="text" value={position} onChange={e => setPosition(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>직무 (수정 가능)</label>
                <input type="text" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* 직인 업로드 */}
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <label style={labelStyle}>회사 직인 업로드 (배경 없는 PNG 권장)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCustomSeal(reader.result);
                        localStorage.setItem('customSeal', reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ fontSize: '12px' }}
                />
                {customSeal && (
                  <button 
                    onClick={() => { setCustomSeal(''); localStorage.removeItem('customSeal'); }}
                    style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    직인 삭제
                  </button>
                )}
              </div>
              {customSeal && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>현재 등록된 직인:</span>
                  <img src={customSeal} alt="직인 미리보기" style={{ width: '40px', height: '40px', objectFit: 'contain', border: '1px solid #333' }} />
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleGenerate} style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
              <FileText size={18} style={{ marginRight: '8px' }} />
              증명서 미리보기 생성
            </button>
          </div>

          {/* 오른쪽: 발급 기록 리스트 */}
          <div className="glass-card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-secondary)' }}>최근 발급 기록</h3>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {certificates && certificates.length > 0 ? (
                certificates.map((cert) => (
                  <div key={cert.id} style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.05)', 
                    marginBottom: '10px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'white' }}>{cert.empName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{cert.certNo}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--primary-color)' }}>{cert.type}</span>
                      <span>{cert.issueDate}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>용도: {cert.purpose}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
                  <FileText size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p>발급 기록이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 미리보기 모달 */}
        {showPreview && selectedEmp && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowPreview(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: 'white', borderRadius: '12px', padding: '0' }}>
              <div style={{ padding: '40px', color: '#000' }}>
                {renderCertificate(selectedEmp, certType, purpose, issueDate, company, formatDate, getWorkPeriod, certTitle, certTitleEn, position, role, customSeal)}
              </div>
              <div style={{ padding: '16px 40px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button onClick={() => setShowPreview(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', color: '#333', cursor: 'pointer' }}>닫기</button>
                <button onClick={handlePrint} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>🖨️ 인쇄 / PDF 저장</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========== 인쇄 전용 증명서 ========== */}
      {selectedEmp && showPreview && (
        <div className="print-only" style={{ padding: '40px' }}>
          {renderCertificate(selectedEmp, certType, purpose, issueDate, company, formatDate, getWorkPeriod, certTitle, certTitleEn, position, role, customSeal)}
        </div>
      )}
    </div>
  );
}

/* ===== 증명서 본문 렌더링 (화면 미리보기 + 인쇄 공용) ===== */
function renderCertificate(emp, certType, purpose, issueDate, company, formatDate, getWorkPeriod, certTitle, certTitleEn, position, role, customSeal) {
  const today = new Date(issueDate);
  const issueDateFormatted = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div style={{ fontFamily: "'Noto Serif KR', 'Batang', serif", color: '#000', lineHeight: '2' }}>
      {/* 상단 제목 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '16px', marginBottom: '4px', color: '#000' }}>
          {certTitle}
        </h1>
        <div style={{ fontSize: '14px', color: '#666', letterSpacing: '4px' }}>{certTitleEn}</div>
      </div>

      {/* 인적사항 테이블 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '15px' }}>
        <tbody>
          <tr>
            <td style={cellLabelStyle}>성 명</td>
            <td style={cellValueStyle}>{emp.name}</td>
            <td style={cellLabelStyle}>생년월일</td>
            <td style={cellValueStyle}>{formatDate(emp.birth_date)}</td>
          </tr>
          <tr>
            <td style={cellLabelStyle}>주 소</td>
            <td colSpan={3} style={cellValueStyle}>{emp.address || '-'}</td>
          </tr>
          <tr>
            <td style={cellLabelStyle}>직 책</td>
            <td style={cellValueStyle}>{position || '-'}</td>
            <td style={cellLabelStyle}>직 무</td>
            <td style={cellValueStyle}>{role || '-'}</td>
          </tr>
          <tr>
            <td style={cellLabelStyle}>입 사 일</td>
            <td style={cellValueStyle}>{formatDate(emp.join_date)}</td>
            <td style={cellLabelStyle}>{certType === 'career' ? '퇴 사 일' : '재직기간'}</td>
            <td style={cellValueStyle}>
              {certType === 'career'
                ? formatDate(emp.resignation_date)
                : getWorkPeriod(emp)}
            </td>
          </tr>
          <tr>
            <td style={cellLabelStyle}>고용형태</td>
            <td style={cellValueStyle}>{emp.employment_type}</td>
            <td style={cellLabelStyle}>용 도</td>
            <td style={cellValueStyle}>{purpose}</td>
          </tr>
        </tbody>
      </table>

      {/* 본문 */}
      <div style={{ textAlign: 'center', fontSize: '16px', margin: '40px 0 50px', lineHeight: '2.2' }}>
        {certType === 'employment' ? (
          <p>
            위 사람은 <strong>{company.name}</strong>에 재직하고 있음을 증명합니다.
          </p>
        ) : (
          <p>
            위 사람은 <strong>{company.name}</strong>에서 위 기간 동안 근무하였음을 증명합니다.
          </p>
        )}
      </div>

      {/* 발급일 */}
      <div style={{ textAlign: 'center', fontSize: '18px', margin: '50px 0 60px', fontWeight: 'bold' }}>
        {issueDateFormatted}
      </div>

      {/* 회사명 및 직인 */}
      <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', letterSpacing: '6px' }}>
          {company.name}
        </div>
        <div style={{ fontSize: '16px', marginBottom: '20px' }}>대 표 이 사 (인)</div>

        {/* 직인 표시 (커스텀 업로드 또는 기본 가상 직인) */}
        {customSeal ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(40px, -20px)', // 글자와 겹치게 조정
            width: '80px',
            height: '80px',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            <img src={customSeal} alt="직인" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div style={{
            display: 'inline-block',
            width: '100px', height: '100px',
            borderRadius: '50%',
            border: '3px solid #cc0000',
            color: '#cc0000',
            fontSize: '13px',
            fontWeight: 'bold',
            lineHeight: '1.3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            margin: '0 auto',
            transform: 'rotate(-8deg)',
            opacity: 0.85,
            padding: '10px'
          }}>
            {company.name}<br />대표이사<br />직인
          </div>
        )}
      </div>

      {/* 하단 구분선 */}
      <div style={{ borderTop: '2px solid #000', marginTop: '40px', paddingTop: '10px', textAlign: 'center', fontSize: '12px', color: '#666' }}>
        본 증명서는 {purpose}으로 발급되었습니다. | 발급번호: CERT-{Date.now().toString(36).toUpperCase().slice(-6)}
      </div>
    </div>
  );
}

/* ===== 스타일 상수 ===== */
const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.2)',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box'
};

const cellLabelStyle = {
  border: '1px solid #333',
  padding: '10px 16px',
  background: '#f5f5f5',
  fontWeight: 'bold',
  width: '15%',
  textAlign: 'center',
  color: '#000'
};

const cellValueStyle = {
  border: '1px solid #333',
  padding: '10px 16px',
  width: '35%',
  color: '#000'
};
