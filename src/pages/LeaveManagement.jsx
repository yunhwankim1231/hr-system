import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getLeaveDetails } from '../utils/leaveCalculations';
import { 
  Info, Plus, Minus, Calendar, X, Check, Printer, 
  Search, Users, Clock, AlertCircle, TrendingDown,
  ChevronRight, Download, FileText, Banknote
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export default function LeaveManagement() {
  const { company, employees, leaveRecords, toggleLeaveRecord, updateEmployee, addLeaveRecord } = useAppContext();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, resigned
  const [filterDept, setFilterDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalEmp, setModalEmp] = useState(null);
  const [tempHours, setTempHours] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);

  // 부서 목록 추출
  const departments = useMemo(() => {
    const depts = new Set(employees.map(emp => emp.department).filter(Boolean));
    return ['all', ...Array.from(depts)];
  }, [employees]);

  // 필터나 연도 변경 시 선택 목록 초기화
  useEffect(() => {
    setSelectedIds([]);
  }, [filterStatus, filterDept, selectedYear, searchTerm]);

  // 기준 날짜를 선택된 연도의 12월 31일로 설정
  const baseDate = new Date(selectedYear, 11, 31);

  // [최적화] leaveRecords를 직원 ID별로 미리 그룹화 (O(R))
  const groupedRecords = useMemo(() => {
    const map = {};
    leaveRecords.forEach(record => {
      const year = new Date(record.leave_date).getFullYear();
      if (year === selectedYear) {
        if (!map[record.employee_id]) map[record.employee_id] = [];
        map[record.employee_id].push(record);
      }
    });
    return map;
  }, [leaveRecords, selectedYear]);

  // 전사 통계 계산 (O(E)로 개선)
  const stats = useMemo(() => {
    let totalAccrued = 0;
    let totalUsed = 0;
    let totalAllowance = 0;

    employees.forEach(emp => {
      // 필터링 적용된 통계
      const matchesStatus = filterStatus === 'active' ? !emp.resignation_date : filterStatus === 'resigned' ? !!emp.resignation_date : true;
      const matchesDept = filterDept === 'all' || emp.department === filterDept;
      
      if (!matchesStatus || !matchesDept) return;

      const workHours = Number(emp.work_hours || 8);
      const { totalLeave } = getLeaveDetails(emp.join_date, baseDate, workHours);
      
      // 최적화된 그룹 맵에서 조회 (O(1))
      const empRecords = groupedRecords[emp.id] || [];
      const used = empRecords.reduce((sum, r) => sum + Number(r.leave_days), 0);
      const remaining = totalLeave - used;

      const baseSalary = Number(emp.base_salary || 0);
      const extraPaysSum = (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const totalFixedMonthly = baseSalary + extraPaysSum;
      const monthlyPaidHours = workHours * 6 * 4.345; 
      const dailyWage = (totalFixedMonthly / monthlyPaidHours) * workHours;
      const allowance = remaining > 0 ? Math.floor(remaining * dailyWage) : 0;

      totalAccrued += totalLeave;
      totalUsed += used;
      totalAllowance += allowance;
    });

    return { totalAccrued, totalUsed, totalRemaining: totalAccrued - totalUsed, totalAllowance };
  }, [employees, groupedRecords, filterStatus, filterDept]);

  const filteredEmployees = employees.filter(emp => {
    const matchesStatus = filterStatus === 'active' ? !emp.resignation_date : filterStatus === 'resigned' ? !!emp.resignation_date : true;
    const matchesDept = filterDept === 'all' || emp.department === filterDept;
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || (emp.department || '').includes(searchTerm);
    return matchesStatus && matchesDept && matchesSearch;
  });

  // [복구] 연차 수동 조정 로직
  const handleAdjustLeave = async (empId, delta) => {
    await addLeaveRecord({
      employee_id: empId,
      leave_date: `${selectedYear}-01-01`,
      leave_days: delta,
      status: '승인',
      reason: `${selectedYear}년 연차 수동 조정 (${delta > 0 ? '+' : ''}${delta})`
    });
  };

  return (
    <div className="leave-management" style={{ animation: 'fadeIn 0.5s ease' }}>
      <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Calendar size={32} style={{ color: '#60a5fa' }} />
            <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>연차 및 휴가 관리</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>전사 연차 발생 현황 및 미사용 수당 부채 실시간 모니터링</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={searchWrapperStyle}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="직원명 또는 부서 검색..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInputStyle}
            />
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => window.print()}
            disabled={selectedIds.length === 0}
          >
            <Printer size={18} /> 보고서 인쇄 ({selectedIds.length})
          </button>
        </div>
      </header>

      {/* 대시보드 카드 */}
      <div style={statsGridStyle}>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <Users size={20} color="#60a5fa" />
            <span style={statLabelStyle}>대상 발생 연차 합계</span>
          </div>
          <div style={statValueStyle}>{stats.totalAccrued.toLocaleString()} <span style={unitStyle}>일</span></div>
        </div>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <TrendingDown size={20} color="#10b981" />
            <span style={statLabelStyle}>대상 사용 완료 연차</span>
          </div>
          <div style={statValueStyle}>{stats.totalUsed.toLocaleString()} <span style={unitStyle}>일</span></div>
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>사용률: {((stats.totalUsed / stats.totalAccrued) * 100 || 0).toFixed(1)}%</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <Clock size={20} color="#fbbf24" />
            <span style={statLabelStyle}>대상 잔여 연차 합계</span>
          </div>
          <div style={statValueStyle}>{stats.totalRemaining.toLocaleString()} <span style={unitStyle}>일</span></div>
        </div>
        <div style={{ ...statCardStyle, background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <Banknote size={20} color="#93c5fd" />
            <span style={{ ...statLabelStyle, color: '#93c5fd' }}>대상 수당 부채(예상)</span>
          </div>
          <div style={{ ...statValueStyle, color: 'white' }}>{stats.totalAllowance.toLocaleString()} <span style={unitStyle}>원</span></div>
          <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '4px' }}>* 현재 필터링된 대상 기준</div>
        </div>
      </div>

      <div style={filterRowStyle}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setFilterStatus('all')} style={filterStatus === 'all' ? activeTabStyle : tabStyle}>전체</button>
          <button onClick={() => setFilterStatus('active')} style={filterStatus === 'active' ? activeTabStyle : tabStyle}>재직자</button>
          <button onClick={() => setFilterStatus('resigned')} style={filterStatus === 'resigned' ? activeTabStyle : tabStyle}>퇴사자</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} color="var(--text-secondary)" />
            <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={selectStyle}>
              <option value="all">전체 부서</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(y => <option key={y} value={y}>{y}년 기준</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center', padding: '20px 24px' }}><input type="checkbox" checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0} onChange={(e) => setSelectedIds(e.target.checked ? filteredEmployees.map(emp => emp.id) : [])} /></th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>직원 정보</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>입사일</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>근무시간</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>발생 연차</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>사용(조정)</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>잔여</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>연차수당(예상)</th>
              <th style={{ textAlign: 'center', padding: '20px 24px' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const workHours = Number(emp.work_hours || 8);
              const { totalLeave, details } = getLeaveDetails(emp.join_date, baseDate, workHours);
              const empRecords = groupedRecords[emp.id] || [];
              const used = empRecords.reduce((sum, r) => sum + Number(r.leave_days), 0);
              const remaining = totalLeave - used;

              const baseSalary = Number(emp.base_salary || 0);
              const extraPaysSum = (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
              const totalFixedMonthly = baseSalary + extraPaysSum;
              const monthlyPaidHours = workHours * 6 * 4.345; 
              const dailyWage = (totalFixedMonthly / monthlyPaidHours) * workHours;
              const allowance = remaining > 0 ? Math.floor(remaining * dailyWage) : 0;

              const allowanceDetail = `
[연차수당 산출 근거]
- 월 통상임금: ${totalFixedMonthly.toLocaleString()}원 (기본급 + 고정수당)
- 월 유급시간: ${Math.round(monthlyPaidHours)}시간
- 1일 통상임금: ${Math.round(dailyWage).toLocaleString()}원
- 미사용 연차: ${remaining}일
---------------------------
계산식: ${Math.round(dailyWage).toLocaleString()}원 × ${remaining}일 = ${allowance.toLocaleString()}원
              `.trim();

              return (
                <tr 
                  key={emp.id} 
                  className="table-row-hover"
                  style={{ 
                    ...(selectedIds.includes(emp.id) ? { background: 'rgba(59, 130, 246, 0.08)' } : {}),
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}><input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, emp.id] : selectedIds.filter(id => id !== emp.id))} /></td>
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px' }}>{emp.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.department || '부서미지정'}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', padding: '18px 24px' }}>{emp.join_date}</td>
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <input type="number" value={tempHours[emp.id] !== undefined ? tempHours[emp.id] : workHours} min="1" max="12" step="0.5" onChange={(e) => setTempHours({ ...tempHours, [emp.id]: e.target.value })} onBlur={(e) => { const newVal = Number(e.target.value); if (!isNaN(newVal) && newVal !== workHours) { updateEmployee(emp.id, { work_hours: newVal }); } setTempHours(prev => { const n = { ...prev }; delete n[emp.id]; return n; }); }} style={hourInputStyle} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>h</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', cursor: 'help', padding: '18px 24px' }} title={details}><span style={accruedBadgeStyle}>{totalLeave}</span></td>
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <button onClick={() => handleAdjustLeave(emp.id, -0.5)} style={adjustBtnStyle}>-</button>
                      <span style={{ fontWeight: 'bold', color: '#ef4444', minWidth: '30px', fontSize: '15px' }}>{used}</span>
                      <button onClick={() => handleAdjustLeave(emp.id, 0.5)} style={{ ...adjustBtnStyle, color: '#60a5fa' }}>+</button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}><span style={{ ...accruedBadgeStyle, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{remaining}</span></td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', padding: '18px 24px', cursor: 'help' }} title={allowanceDetail}>
                    <span style={{ borderBottom: '1px dotted rgba(255,255,255,0.3)' }}>{allowance.toLocaleString()}원</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '18px 24px' }}><button onClick={() => setModalEmp(emp)} style={actionBtnStyle}><Calendar size={14} /> 기록</button></td>
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
          records={groupedRecords[modalEmp.id] || []}
          onClose={() => setModalEmp(null)}
          onToggle={toggleLeaveRecord}
        />
      )}

      <LeavePayoffReport selectedEmployees={employees.filter(emp => selectedIds.includes(emp.id))} leaveRecords={leaveRecords} selectedYear={selectedYear} baseDate={baseDate} company={company} />
    </div>
  );
}

// Sub-components
function LeaveUsageModal({ employee, year, records, onClose, onToggle }) {
  const recordsMap = useMemo(() => {
    return records.reduce((acc, record) => {
      acc[record.leave_date] = Number(record.leave_days);
      return acc;
    }, {});
  }, [records]);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  return (
    <div style={overlayStyle}>
      <div className="glass-card" style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div><h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{employee.name} - {year}년 연차 사용 상세</h3><p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>빈칸: 미사용 | 파랑: 종일(1.0) | 노랑: 반차(0.5)</p></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {months.map(m => (
            <div key={m} style={monthBoxStyle}>
              <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#60a5fa' }}>{m}월</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {Array.from({ length: new Date(year, m, 0).getDate() }, (_, i) => {
                  const d = i + 1;
                  const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const val = recordsMap[dateStr] || 0;
                  return (<div key={d} onClick={() => onToggle(employee.id, dateStr, val)} style={{ ...dayStyle, background: val === 1.0 ? 'rgba(59, 130, 246, 0.4)' : val === 0.5 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255,255,255,0.05)', border: val > 0 ? `1px solid ${val === 1.0 ? '#3b82f6' : '#fbbf24'}` : '1px solid rgba(255,255,255,0.1)' }}>{d}</div>);
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeavePayoffReport({ selectedEmployees, leaveRecords, selectedYear, baseDate, company }) {
  return (
    <div className="print-only" style={{ padding: '40px', color: 'black', background: 'white' }}>
      <h1 style={{ textAlign: 'center', textDecoration: 'underline', marginBottom: '30px' }}>연차 유급휴가 정산 보고서</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black' }}>
        <thead><tr style={{ background: '#eee' }}><th style={thStyle}>성명</th><th style={thStyle}>입사일</th><th style={thStyle}>발생</th><th style={thStyle}>사용</th><th style={thStyle}>잔여</th><th style={thStyle}>1일 통상임금</th><th style={thStyle}>정산금액</th></tr></thead>
        <tbody>
          {selectedEmployees.map(emp => {
            const workHours = Number(emp.work_hours || 8);
            const { totalLeave } = getLeaveDetails(emp.join_date, baseDate, workHours);
            const used = leaveRecords.filter(r => r.employee_id === emp.id && new Date(r.leave_date).getFullYear() === selectedYear).reduce((sum, r) => sum + Number(r.leave_days), 0);
            const remaining = totalLeave - used;
            const baseSalary = Number(emp.base_salary || 0);
            const totalFixedMonthly = baseSalary + (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const dailyWage = (totalFixedMonthly / (workHours * 6 * 4.345)) * workHours;
            return (<tr key={emp.id}><td style={tdStyle}>{emp.name}</td><td style={tdStyle}>{emp.join_date}</td><td style={tdStyle}>{totalLeave}</td><td style={tdStyle}>{used}</td><td style={tdStyle}>{remaining}</td><td style={tdStyle}>{Math.round(dailyWage).toLocaleString()}원</td><td style={tdStyle}>{(remaining > 0 ? Math.floor(remaining * dailyWage) : 0).toLocaleString()}원</td></tr>);
          })}
        </tbody>
      </table>
      <div style={{ marginTop: '50px', textAlign: 'center' }}>위와 같이 {selectedYear}년도 연차 수당을 정산함</div>
      <div style={{ marginTop: '80px', textAlign: 'right', fontSize: '20px', fontWeight: 'bold' }}>{company.name} 대표이사 (인)</div>
    </div>
  );
}

// Styles
const searchWrapperStyle = { display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', width: '300px' };
const searchInputStyle = { background: 'none', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '14px' };
const statsGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' };
const statCardStyle = { padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--card-border)' };
const statLabelStyle = { fontSize: '13px', color: 'var(--text-secondary)' };
const statValueStyle = { fontSize: '24px', fontWeight: 'bold' };
const unitStyle = { fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' };
const filterRowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' };
const tabStyle = { padding: '8px 16px', borderRadius: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' };
const activeTabStyle = { ...tabStyle, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', fontWeight: '600' };
const selectStyle = { padding: '6px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: 'white', fontSize: '13px' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
const hourInputStyle = { width: '45px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textAlign: 'center', padding: '4px', borderRadius: '4px' };
const accruedBadgeStyle = { background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' };
const adjustBtnStyle = { width: '20px', height: '20px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' };
const actionBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'white', cursor: 'pointer', fontSize: '12px', margin: '0 auto' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle = { width: '90%', maxWidth: '1000px', maxHeight: '80vh', overflowY: 'auto', padding: '32px' };
const monthBoxStyle = { background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' };
const dayStyle = { height: '30px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s' };
const thStyle = { border: '1px solid black', padding: '8px' };
const tdStyle = { border: '1px solid black', padding: '8px', textAlign: 'center' };
