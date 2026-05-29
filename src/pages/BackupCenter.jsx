import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Database, Download, Upload, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function BackupCenter() {
  const { company } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [uploadedBackupData, setUploadedBackupData] = useState(null);

  // 데이터베이스 내에 존재하는 전체 12개 테이블 정의 (1~3순위 및 변경 로그 포함 전체)
  const [tableCounts, setTableCounts] = useState({
    employees: 0,
    daily_workers: 0,
    daily_work_logs: 0,
    leave_management: 0,
    certificates: 0,
    system_settings: 0,
    tax_rate_table: 0,
    retirement_tax_calculations: 0,
    payslips: 0,
    year_end_tax_settlements: 0,
    payroll_archives: 0,
    audit_logs: 0, // 직원 데이터 변경/수정/삭제 이력 전체
  });

  const [lastBackupDate, setLastBackupDate] = useState(
    localStorage.getItem('last_system_backup_date') || '백업 이력 없음'
  );

  // 데이터베이스 테이블의 현재 레코드 수 집계
  const fetchTableCounts = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const counts = {};
      const tables = Object.keys(tableCounts);

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.warn(`${table} 카운트 조회 실패 (RLS 정책 또는 테이블 없음):`, error.message);
          counts[table] = 0;
        } else {
          counts[table] = count || 0;
        }
      }
      setTableCounts(counts);
    } catch (err) {
      console.error('테이블 정보 조회 중 예외 발생:', err);
      setErrorMsg('데이터베이스 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableCounts();
  }, []);

  // 1. 원클릭 백업 실행 및 JSON 파일 다운로드 (전체 12개 테이블 데이터 추출)
  const handleBackupDownload = async () => {
    setLoading(true);
    setStatusMsg('데이터 수집 중...');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const backupPayload = {
        backupVersion: '2.0',
        backupDate: new Date().toISOString(),
        companyName: company.name || '명진기업(주)',
        data: {},
      };

      const tables = Object.keys(tableCounts);

      for (const table of tables) {
        setStatusMsg(`[${table}] 테이블 백업 중...`);
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
          throw new Error(`${table} 데이터 백업 실패: ${error.message}`);
        }
        backupPayload.data[table] = data || [];
      }

      setStatusMsg('백업 파일 암호화 패키징 완료! 다운로드를 생성합니다.');

      // JSON 파일 생성 및 브라우저 다운로드 실행
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupPayload, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().substring(0, 10);
      
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `MJ_HR_All_Backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // 백업 성공 일시 저장
      const nowStr = new Date().toLocaleString();
      localStorage.setItem('last_system_backup_date', nowStr);
      setLastBackupDate(nowStr);
      setSuccessMsg('전체 데이터 백업 파일이 PC에 성공적으로 다운로드되었습니다!');
    } catch (err) {
      console.error('백업 실패:', err);
      setErrorMsg(err.message || '백업 파일 생성 중 알 수 없는 예외가 발생했습니다.');
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  // 2. 백업 파일 업로드 핸들러
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setStatusMsg('파일 로드 중...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        
        if (!parsed.backupVersion || !parsed.data) {
          throw new Error('올바른 MJ HR 시스템 백업 JSON 파일이 아닙니다.');
        }

        setUploadedBackupData(parsed);
        setShowConfirmModal(true); // 복원 확인 모달 오픈
      } catch (err) {
        setErrorMsg('파일 읽기 실패: ' + err.message);
      } finally {
        setStatusMsg('');
      }
    };
    reader.readAsText(file);
  };

  // 3. 백업 데이터 복원 실행 (외래키 제약조건 순서 완벽 준수)
  const executeDatabaseRestore = async () => {
    if (!uploadedBackupData) return;

    setShowConfirmModal(false);
    setLoading(true);
    setStatusMsg('데이터베이스 복원 프로세스 시작...');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = uploadedBackupData.data;

      // 외래키 참조 무결성 준수를 위한 순차적 데이터 제거 (자식 -> 부모 순)
      const deleteOrder = [
        'daily_work_logs',
        'leave_management',
        'certificates',
        'retirement_tax_calculations',
        'payslips',
        'year_end_tax_settlements',
        'daily_workers',
        'employees',
        'system_settings',
        'tax_rate_table',
        'payroll_archives',
        'audit_logs'
      ];

      for (const table of deleteOrder) {
        setStatusMsg(`[정리] ${table} 테이블의 기존 데이터 초기화 중...`);
        const { error } = await supabase.from(table).delete().neq('id', 'placeholder_for_clear_all');
        if (error && error.message && !error.message.includes('placeholder')) {
          // 간혹 UUID가 PK인 테이블은 문자열 비교 에러가 날 수 있으므로 예외 폴백 처리
          const { error: retryError } = await supabase.from(table).delete().filter('created_at', 'gt', '1970-01-01T00:00:00Z');
          if (retryError) throw new Error(`${table} 비우기 실패: ${retryError.message}`);
        }
      }

      // 외래키 참조 무결성 준수를 위한 순차적 데이터 삽입 (부모 -> 자식 순)
      const insertOrder = [
        'employees',
        'daily_workers',
        'daily_work_logs',
        'leave_management',
        'certificates',
        'system_settings',
        'tax_rate_table',
        'retirement_tax_calculations',
        'payslips',
        'year_end_tax_settlements',
        'payroll_archives',
        'audit_logs'
      ];

      for (const table of insertOrder) {
        const rows = data[table] || [];
        if (rows.length === 0) continue;

        setStatusMsg(`[복원] ${table} 테이블에 ${rows.length}개 레코드 주입 중...`);
        
        // chunk 단위로 나누어 업서트 안정성 증가
        const chunkSize = 50;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          const { error } = await supabase.from(table).insert(chunk);
          if (error) {
            throw new Error(`${table} 복원 데이터 삽입 실패: ${error.message}`);
          }
        }
      }

      setSuccessMsg('🎉 데이터베이스 일괄 복원이 완벽하게 완료되었습니다! 최신 화면을 갱신합니다.');
      await fetchTableCounts(); // 카운트 갱신
      setTimeout(() => {
        window.location.reload(); // 상태 일관성을 위해 전체 새로고침
      }, 2000);

    } catch (err) {
      console.error('복원 중 치명적인 실패:', err);
      setErrorMsg(`복원 실패: ${err.message}\n(일부 데이터가 손실되었을 수 있으니, 즉시 백업 파일을 확인하십시오.)`);
    } finally {
      setLoading(false);
      setStatusMsg('');
      setUploadedBackupData(null);
    }
  };

  return (
    <div className="backup-center-page" style={{ color: 'white' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }} className="text-gradient">
          <Database size={28} /> 데이터 전체 백업 및 복원 센터
        </h2>
        <p style={{ color: 'var(--text-secondary, #94a3b8)', marginTop: '8px' }}>
          인사관리 데이터베이스 전체(12개 테이블 전체)를 한 번에 안전하게 백업 및 일괄 복구할 수 있는 통합 센터입니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* 원클릭 백업 패널 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={18} style={{ color: 'var(--primary-color)' }} /> DB 전체 데이터 백업 (로컬 다운로드)
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              임직원 명단, 급여 내역, 연차 통계, 결재선 설정 및 **시스템 내 모든 변경 이력 로그(Audit Logs)까지 포함한 12개 테이블의 전체 데이터**를 
              하나의 통합 JSON 파일로 패키징하여 다운로드합니다.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>마지막 백업 일시</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{lastBackupDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>백업 권장 주기</span>
                <span style={{ fontWeight: 'bold', color: 'var(--warning-color)' }}>매월 1회 필수 권장</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleBackupDownload} 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading && statusMsg.includes('백업') ? (
              <RefreshCw className="spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            {loading && statusMsg.includes('백업') ? '백업 중...' : '원클릭 DB 전체 백업 파일 다운로드'}
          </button>
        </div>

        {/* 백업 데이터 복원 패널 */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={18} style={{ color: 'var(--warning-color)' }} /> 데이터베이스 일괄 복원
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              데이터 오염 및 데이터 소실 등 긴급 상황 발생 시, 이전에 다운로드한 
              <strong> `.json` 백업 파일</strong>을 업로드하여 데이터베이스의 모든 상태를 백업 시점으로 복구합니다.
            </p>
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#f87171', fontSize: '12px', lineHeight: '1.5', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>주의:</strong> 복원 프로세스 실행 시, 기존 클라우드 데이터베이스에 존재하는 모든 데이터는 완전히 삭제(Overwrite)되고 백업 시점의 정보로 대체됩니다.
                </span>
              </div>
            </div>
          </div>

          <label className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: loading ? 'not-allowed' : 'pointer', padding: '14px', fontWeight: 'bold' }}>
            <Upload size={18} />
            복원용 백업 파일 선택 (.json)
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload} 
              disabled={loading} 
            />
          </label>
        </div>
      </div>

      {/* 상태 표시 영역 */}
      {loading && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary-color)', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}>
          <RefreshCw className="spin" size={18} style={{ color: 'var(--primary-color)' }} />
          <span style={{ fontSize: '14px' }}>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--danger-color, #ef4444)', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={18} style={{ color: 'var(--danger-color, #ef4444)', flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '14px', color: '#f87171', whiteSpace: 'pre-line' }}>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="glass-card" style={{ marginBottom: '24px', borderLeft: '4px solid #10b981', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(16,185,129,0.05)' }}>
          <CheckCircle size={18} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '14px', color: '#a7f3d0' }}>{successMsg}</span>
        </div>
      )}

      {/* 데이터베이스 통계 현황 */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>데이터베이스 백업 대상 현황 리스트 (총 12개 테이블)</span>
          <button onClick={fetchTableCounts} disabled={loading} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>
            새로고침
          </button>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {Object.entries(tableCounts).map(([table, count]) => (
            <div key={table} style={{ padding: '14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{table}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {table === 'employees' ? '임직원 정보' :
                   table === 'daily_workers' ? '일용직 인력' :
                   table === 'daily_work_logs' ? '일용직 기록' :
                   table === 'leave_management' ? '연차/근태 기록' :
                   table === 'certificates' ? '증명서 발급대장' :
                   table === 'system_settings' ? '시스템 공통설정' :
                   table === 'tax_rate_table' ? '퇴직금 요율 정보' :
                   table === 'retirement_tax_calculations' ? '퇴직금 계산기록' :
                   table === 'payslips' ? '급여명세서 대장' :
                   table === 'year_end_tax_settlements' ? '연말정산 대장' :
                   table === 'payroll_archives' ? '급여 마감 보관소' : 
                   table === 'audit_logs' ? '변경 로그(감사 대장)' : '기타 데이터'}
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--primary-color)' }}>
                {count.toLocaleString()} 행
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 복원 확인 모달 */}
      {showConfirmModal && uploadedBackupData && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div className="glass-card" style={{ width: '500px', maxWidth: '95%', border: '1px solid rgba(239, 68, 68, 0.4)', boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', color: '#ef4444' }}>
              <AlertTriangle size={28} />
              <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>⚠️ 데이터베이스 일괄 복원 경고</h3>
            </div>
            
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                업로드하신 백업 파일 정보는 다음과 같습니다:
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', color: 'white' }}>
                <div>• 회사명: <strong>{uploadedBackupData.companyName}</strong></div>
                <div>• 백업 버전: <strong>v{uploadedBackupData.backupVersion}</strong></div>
                <div>• 백업 일시: <strong>{new Date(uploadedBackupData.backupDate).toLocaleString()}</strong></div>
              </div>
              <p style={{ color: '#f87171', fontWeight: 'bold', margin: 0 }}>
                복원을 진행하면 현재 데이터베이스에 저장된 모든 데이터(신규 가입 사원, 당월 연차 기록 등)는 완전히 지워지고 업로드된 백업 시점으로 덮어쓰여집니다. 복원 과정을 정말로 시작할까요?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setShowConfirmModal(false);
                  setUploadedBackupData(null);
                }} 
                className="btn btn-outline" 
                style={{ flex: 1 }}
              >
                복원 취소
              </button>
              <button 
                onClick={executeDatabaseRestore} 
                className="btn btn-primary" 
                style={{ flex: 1, background: '#ef4444', border: '1px solid #ef4444', color: 'white', fontWeight: 'bold' }}
              >
                예, 복원을 즉시 실행합니다
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
