import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { getLeaveDetails } from '../utils/leaveCalculations';
import { Info, Plus, Minus, Calendar, X, Check } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function LeaveManagement() {
  const { employees, leaveRecords, addLeaveRecord, removeLeaveRecord, setLeaveRecords, updateEmployee } = useAppContext();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterStatus, setFilterStatus] = useState('active'); // active, resigned, all
  const [modalEmp, setModalEmp] = useState(null);
  const [tempHours, setTempHours] = useState({}); // 입력 중인 임시 근무시간 상태

  // 기준 날짜를 선택된 연도의 12월 31일로 설정 (해당 연도 전체 발생분 기준)
  const baseDate = new Date(selectedYear, 11, 31);

  const filteredEmployees = employees.filter(emp => {
    if (filterStatus === 'active') return !emp.resignation_date;
    if (filterStatus === 'resigned') return !!emp.resignation_date;
    return true;
  });

  const handleAdjustLeave = async (empId, delta) => {
    if (delta > 0) {
      await addLeaveRecord({
        employee_id: empId,
        leave_date: `${selectedYear}-01-01`,
        leave_days: delta,
        status: '승인',
        reason: `${selectedYear}년 연차 수동 조정 (+${delta})`
      });
    } else {
      await addLeaveRecord({
        employee_id: empId,
        leave_date: `${selectedYear}-01-01`,
        leave_days: delta,
        status: '승인',
        reason: `${selectedYear}년 연차 수동 조정 (${delta})`
      });
    }
  };

  const handleToggleDate = async (empId, dateStr, currentVal) => {
    // 0 -> 1.0 -> 0.5 -> 0
    let nextVal = 0;
    if (currentVal === 0) nextVal = 1.0;
    else if (currentVal === 1.0) nextVal = 0.5;
    else nextVal = 0;

    // 기존 기록 삭제 (해당 날짜의 모든 기록)
    const { error: delError } = await supabase
      .from('leave_management')
      .delete()
      .eq('employee_id', empId)
      .eq('leave_date', dateStr);

    if (delError) {
      console.error('기존 기록 삭제 실패:', delError.message);
      return;
    }

    // 새로운 기록 추가 (nextVal > 0 인 경우)
    if (nextVal > 0) {
      const { data: newData, error: insError } = await supabase
        .from('leave_management')
        .insert([{
          employee_id: empId,
          leave_date: dateStr,
          leave_days: nextVal,
          status: '승인',
          reason: '캘린더 수동 기록'
        }])
        .select();

      if (!insError && newData) {
        setLeaveRecords(prev => [...prev.filter(r => !(r.employee_id === empId && r.leave_date === dateStr)), newData[0]]);
      }
    } else {
      setLeaveRecords(prev => prev.filter(r => !(r.employee_id === empId && r.leave_date === dateStr)));
    }
  };

  return (
    <div className="leave-management">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>연차 관리 현황</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>조회 대상:</span>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="active" style={optStyle}>재직자만</option>
              <option value="resigned" style={optStyle}>퇴사자만</option>
              <option value="all" style={optStyle}>전체</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>기준 연도:</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: 16 }, (_, i) => currentYear - 5 + i).map(year => (
                <option key={year} value={year} style={optStyle}>{year}년</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>직원명</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>입사일</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>1일 근무시간</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>
                총 발생 연차 <Info size={14} style={{ marginLeft: '4px', verticalAlign: 'middle', opacity: 0.5 }} />
              </th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>사용 연차 (조정)</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>잔여 연차</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>연차 수당 예상액</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'center' }}>사용 상세</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const workHours = Number(emp.work_hours || 8);
              const { totalLeave, details } = getLeaveDetails(emp.join_date, baseDate, workHours);
              const empRecords = leaveRecords.filter(r => r.employee_id === emp.id && new Date(r.leave_date).getFullYear() === selectedYear);
              const usedLeave = empRecords.reduce((sum, r) => sum + Number(r.leave_days), 0);
              const remaining = totalLeave - usedLeave;

              // 연차 수당 계산 로직 (개별 근로시간 반영)
              const baseSalary = Number(emp.base_salary || 0);
              const extraPaysSum = (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
              const totalFixedMonthly = baseSalary + extraPaysSum;
              
              // 월 유급 근로시간 계산 (주휴 포함 비례)
              const monthlyPaidHours = workHours * 6 * 4.345; 
              const dailyWage = (totalFixedMonthly / monthlyPaidHours) * workHours;
              
              const allowance = remaining > 0 ? Math.floor(remaining * dailyWage) : 0;

              const allowanceDetail = `
[통상임금 산정 내역]
- 기본급: ${baseSalary.toLocaleString()}원
- 수당합계: ${extraPaysSum.toLocaleString()}원
- 월 통상임금: ${totalFixedMonthly.toLocaleString()}원
- 1일 근로시간: ${workHours}시간
- 월 유급시간: ${Math.round(monthlyPaidHours)}시간
- 1일 통상임금: ${Math.round(dailyWage).toLocaleString()}원
(계산식: 월 통상임금 / 월 유급시간 * ${workHours}h * 잔여 ${remaining}일)
              `.trim();

              return (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: emp.resignation_date ? 'var(--text-secondary)' : 'inherit' }}>
                  <td style={{ padding: '16px 24px' }}>
                    {emp.name}
                    {emp.resignation_date && <span style={resignedBadgeStyle}>퇴사</span>}
                  </td>
                  <td style={{ padding: '16px 24px', color: 'var(--text-secondary)' }}>{emp.join_date}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <input 
                        type="number" 
                        value={tempHours[emp.id] !== undefined ? tempHours[emp.id] : workHours} 
                        min="1" 
                        max="12"
                        step="0.5"
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setTempHours(prev => ({ ...prev, [emp.id]: valStr }));
                          if (valStr !== "" && !isNaN(valStr)) {
                            updateEmployee(emp.id, { work_hours: Number(valStr) });
                          }
                        }}
                        onBlur={() => {
                          setTempHours(prev => {
                            const newState = { ...prev };
                            delete newState[emp.id];
                            return newState;
                          });
                        }}
                        style={{
                          width: '45px',
                          padding: '4px',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: 'var(--text-primary)',
                          textAlign: 'center'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>h</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', fontWeight: 'bold', cursor: 'help' }} title={details}>
                    <span style={{ borderBottom: '1px dotted rgba(255,255,255,0.3)' }}>{totalLeave}</span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => handleAdjustLeave(emp.id, -1)} style={miniBtnStyle}> -1 </button>
                        <button onClick={() => handleAdjustLeave(emp.id, -0.5)} style={miniBtnStyle}> -.5 </button>
                      </div>
                      <div style={{ minWidth: '40px', textAlign: 'center' }}>
                        <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>{usedLeave}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button onClick={() => handleAdjustLeave(emp.id, 1)} style={plusBtnStyle}> +1 </button>
                        <button onClick={() => handleAdjustLeave(emp.id, 0.5)} style={plusBtnStyle}> +.5 </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{remaining}</td>
                  <td 
                    style={{ padding: '16px 24px', textAlign: 'right', fontWeight: 'bold', cursor: 'help' }} 
                    title={allowanceDetail}
                  >
                    {allowance.toLocaleString()}원
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <button onClick={() => setModalEmp(emp)} style={historyBtnStyle}>
                      <Calendar size={16} />
                      기록/상세
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalEmp && (
        <LeaveUsageModal 
          employee={modalEmp} 
          year={selectedYear} 
          records={leaveRecords.filter(r => r.employee_id === modalEmp.id && new Date(r.leave_date).getFullYear() === selectedYear)}
          onClose={() => setModalEmp(null)}
          onToggle={handleToggleDate}
        />
      )}
    </div>
  );
}

function LeaveUsageModal({ employee, year, records, onClose, onToggle }) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const getDaysInMonth = (m) => new Date(year, m, 0).getDate();
  const getRecordForDate = (dateStr) => records.find(r => r.leave_date === dateStr);

  return (
    <div style={modalOverlayStyle}>
      <div className="glass-card" style={modalContentStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{employee.name} - {year}년 연차 사용 상세</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              날짜를 클릭하여 기록하세요: [빈칸] 미사용 → [파랑] 종일(1.0) → [노랑] 반차(0.5)
            </p>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20} /></button>
        </div>

        <div style={monthsGridStyle}>
          {months.map(m => {
            const daysCount = getDaysInMonth(m);
            return (
              <div key={m} style={monthCardStyle}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#60a5fa' }}>{m}월</h4>
                <div style={daysGridStyle}>
                  {Array.from({ length: daysCount }, (_, i) => {
                    const d = i + 1;
                    const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const record = getRecordForDate(dateStr);
                    const val = record ? Number(record.leave_days) : 0;
                    
                    return (
                      <div 
                        key={d} 
                        onClick={() => onToggle(employee.id, dateStr, val)}
                        style={{
                          ...dayBoxStyle,
                          background: val === 1.0 ? 'rgba(59, 130, 246, 0.4)' : val === 0.5 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.05)',
                          border: val > 0 ? `1px solid ${val === 1.0 ? '#3b82f6' : '#fbbf24'}` : '1px solid rgba(255,255,255,0.1)'
                        }}
                        title={`${m}월 ${d}일 - ${val === 1.0 ? '연차(1.0)' : val === 0.5 ? '반차(0.5)' : '기록없음'}`}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Styles
const resignedBadgeStyle = { marginLeft: '8px', fontSize: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' };
const miniBtnStyle = { padding: '2px 6px', fontSize: '10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 'bold', width: '32px' };
const plusBtnStyle = { ...miniBtnStyle, color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)' };
const historyBtnStyle = { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', margin: '0 auto' };
const selectStyle = { padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--card-border)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none', fontSize: '14px' };
const optStyle = { background: '#1e1e1e', color: 'var(--text-primary)' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '40px' };
const modalContentStyle = { width: '100%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', border: '1px solid var(--card-border)' };
const closeBtnStyle = { background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' };
const monthsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' };
const monthCardStyle = { padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const daysGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' };
const dayBoxStyle = { height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' };
