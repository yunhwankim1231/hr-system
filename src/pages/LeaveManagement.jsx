import React from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateAnnualLeave } from '../utils/leaveCalculations';
import { Calendar, CheckCircle, AlertTriangle } from 'lucide-react';

export default function LeaveManagement() {
  const { employees } = useAppContext();

  return (
    <div className="leave-management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>연차 관리 현황</h2>
        <button className="btn btn-primary" onClick={() => alert('연차 신청 팝업 (미구현)')}>
          + 연차 신청 대행
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>직원명</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>고용 형태</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>입사일</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>총 발생 연차</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>사용 연차</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>잔여 연차</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const totalLeave = calculateAnnualLeave(emp.join_date);
              const usedLeave = 0; // 기능 고도화 시 데이터 연동
              const remaining = totalLeave - usedLeave;
              
              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: emp.resignation_date ? 'var(--text-secondary)' : 'inherit' }}>
                  <td style={{ padding: '16px 24px' }}>{emp.name}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      color: '#60a5fa',
                      fontSize: '12px'
                    }}>
                      {emp.employment_type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{emp.join_date}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 'bold' }}>{totalLeave}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', color: '#ef4444' }}>{usedLeave}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{remaining}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {emp.resignation_date ? <><AlertTriangle size={14}/> 퇴사자</> : <><CheckCircle size={14} /> 정상</>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
