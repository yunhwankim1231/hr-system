import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculatePayroll } from '../utils/payrollCalculations';
import { getLeaveDetails } from '../utils/leaveCalculations';
import { Users, CreditCard, ShieldCheck, Banknote, Clock, TrendingDown, Filter, PieChart, BarChart3, Wallet, Briefcase, Activity } from 'lucide-react';

export default function KeyMetrics() {
  const { company, employees, insuranceRates, leaveRecords, employeeCategories } = useAppContext();
  const [workplaceFilter, setWorkplaceFilter] = useState('전체');

  const metricsData = useMemo(() => {
    let totalSalaries = 0;
    let totalInsurances = 0;
    let totalAccruedLeave = 0;
    let totalUsedLeave = 0;
    let totalLeaveDebt = 0;
    let totalSeverancePay = 0;

    let totalBaseSalary = 0;
    let totalExtraPays = 0;

    const positionSalaries = {};
    const ageGroups = { '20대 이하': 0, '30대': 0, '40대': 0, '50대': 0, '60대 이상': 0 };
    const workplaceLeave = {};

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthStr = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const baseDateForLeave = new Date(currentYear, 11, 31); // 연말 기준

    const filteredEmployees = employees.filter(emp => {
      if (workplaceFilter === '전체') return true;
      return emp.workplace === workplaceFilter;
    });

    const activeHeadcount = filteredEmployees.filter(e => !e.resignation_date).length;

    const groupedLeave = {};
    (leaveRecords || []).forEach(r => {
      if (new Date(r.leave_date).getFullYear() === currentYear) {
        if (!groupedLeave[r.employee_id]) groupedLeave[r.employee_id] = [];
        groupedLeave[r.employee_id].push(r);
      }
    });

    filteredEmployees.forEach(emp => {
      if (emp.resignation_date) return; // 제외: 퇴사자

      const payroll = calculatePayroll({ employee: emp, company, rates: insuranceRates, paymentMonth: currentMonthStr });
      totalSalaries += payroll.taxableTotal;

      const employeeInsurance = (payroll.nationalPension || 0) + (payroll.healthInsurance || 0) + (payroll.longTermCare || 0) + (payroll.employmentInsurance || 0);
      const companyInsurance = employeeInsurance; // 단순 1:1 가정
      totalInsurances += companyInsurance + (payroll.workersComp || 0);

      const baseSalary = Number(emp.base_salary || 0);
      const extraPaysSum = (emp.extra_pays || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      totalBaseSalary += baseSalary;
      totalExtraPays += extraPaysSum;

      // 직책별 급여 합계
      const pos = emp.position || '미지정';
      if (!positionSalaries[pos]) positionSalaries[pos] = { sum: 0, count: 0 };
      positionSalaries[pos].sum += (baseSalary + extraPaysSum);
      positionSalaries[pos].count += 1;

      // 연령대 계산
      let age = 0;
      if (emp.resident_number && emp.resident_number.length >= 7) {
        const birthYearPrefix = parseInt(emp.resident_number.substring(0, 2), 10);
        const genderChar = emp.resident_number.substring(7, 8);
        let fullYear = (genderChar === '3' || genderChar === '4') ? 2000 + birthYearPrefix : 1900 + birthYearPrefix;
        age = today.getFullYear() - fullYear;
      } else if (emp.birth_date) {
        age = today.getFullYear() - new Date(emp.birth_date).getFullYear();
      }

      if (age > 0) {
        if (age < 30) ageGroups['20대 이하']++;
        else if (age < 40) ageGroups['30대']++;
        else if (age < 50) ageGroups['40대']++;
        else if (age < 60) ageGroups['50대']++;
        else ageGroups['60대 이상']++;
      }

      // 연차 관련
      const workHours = Number(emp.work_hours || 8);
      const { totalLeave } = getLeaveDetails(emp.join_date, baseDateForLeave, workHours);
      const empUsed = (groupedLeave[emp.id] || []).reduce((sum, r) => sum + Number(r.leave_days), 0);
      const remaining = totalLeave - empUsed;

      const totalFixedMonthly = baseSalary + extraPaysSum;
      const dailyWage = (totalFixedMonthly / (workHours * 6 * 4.345)) * workHours;
      const allowance = remaining > 0 ? Math.floor(remaining * dailyWage) : 0;

      totalAccruedLeave += totalLeave;
      totalUsedLeave += empUsed;
      totalLeaveDebt += allowance;

      // 사업장별 연차
      const wp = emp.workplace || '미분류';
      if (!workplaceLeave[wp]) workplaceLeave[wp] = { total: 0, used: 0 };
      workplaceLeave[wp].total += totalLeave;
      workplaceLeave[wp].used += empUsed;

      // 퇴직금
      const joinDate = new Date(emp.join_date);
      const diffTime = today.getTime() - joinDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 365) {
        const severanceEstimate = totalFixedMonthly * (diffDays / 365);
        totalSeverancePay += Math.floor(severanceEstimate);
      }
    });

    const avgCostPerPerson = activeHeadcount > 0 ? Math.floor((totalSalaries + totalInsurances) / activeHeadcount) : 0;

    const positionAvg = Object.entries(positionSalaries)
      .map(([pos, data]) => ({ name: pos, avg: Math.floor(data.sum / data.count) }))
      .sort((a, b) => b.avg - a.avg);

    const wpLeaveRates = Object.entries(workplaceLeave)
      .map(([wp, data]) => ({ name: wp, rate: data.total > 0 ? (data.used / data.total) * 100 : 0 }))
      .sort((a, b) => a.rate - b.rate); // 소진율 낮은 순

    return {
      headcount: activeHeadcount,
      totalSalaries,
      totalInsurances,
      avgCostPerPerson,
      totalBaseSalary,
      totalExtraPays,
      positionAvg,
      ageGroups,
      wpLeaveRates,
      totalAccruedLeave,
      totalUsedLeave,
      totalLeaveDebt,
      totalSeverancePay
    };
  }, [company, employees, leaveRecords, insuranceRates, workplaceFilter]);

  const workplaces = [...new Set([...(employeeCategories?.workplaces || []), ...employees.map(e => e.workplace).filter(Boolean)])];

  // Colors for Age Groups
  const ageColors = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];

  return (
    <div className="page-content" style={{ animation: 'fadeIn 0.5s ease-out', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">주요 지표</h2>
          <p style={{ color: 'var(--text-secondary)' }}>기업의 재무 부채 및 주요 인사 인사이트를 분석합니다.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>사업장 필터:</span>
          <select
            value={workplaceFilter}
            onChange={(e) => setWorkplaceFilter(e.target.value)}
            style={{
              background: 'transparent',
              color: 'white',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <option value="전체" style={{ color: 'black' }}>전체 사업장</option>
            {workplaces.map(wp => (
              <option key={wp} value={wp} style={{ color: 'black' }}>{wp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. 핵심 요약 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Users className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>재직 인원</h3>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }} className="text-gradient">
            {metricsData.headcount.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>명</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Wallet className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>1인당 평균 인건비 (월)</h3>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {metricsData.avgCostPerPerson.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>원</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>* 급여 + 회사부담 4대보험 포함</div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <CreditCard className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>이번 달 급여 총액</h3>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {metricsData.totalSalaries.toLocaleString()} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>원</span>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Clock className="text-secondary" />
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>연차 사용률</h3>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>
            {((metricsData.totalUsedLeave / metricsData.totalAccruedLeave) * 100 || 0).toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>%</span>
          </div>
        </div>
      </div>

      {/* 2. 부채 추계 (2번째 위치) */}
      <div className="glass-card" style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={20} color="#60a5fa" /> 기업 재무 부채 추계 <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>(오늘 기준)</span>
            </h3>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>총 인사 관련 예상 부채 합계</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>
              {(metricsData.totalSeverancePay + metricsData.totalLeaveDebt).toLocaleString()} <span style={{ fontSize: '14px' }}>원</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Banknote size={24} color="#60a5fa" />
              <span style={{ fontSize: '13px', color: '#93c5fd' }}>퇴직금 추계액</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              {metricsData.totalSeverancePay.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>원</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>현재 재직 인원의 법정 퇴직금 총액</p>
          </div>

          <div style={{ padding: '24px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Clock size={24} color="#fbbf24" />
              <span style={{ fontSize: '13px', color: '#fcd34d' }}>미사용 연차수당 부채</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
              {metricsData.totalLeaveDebt.toLocaleString()} <span style={{ fontSize: '16px', fontWeight: 'normal' }}>원</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>미사용 연차 전액 정산 시 예상 수당</p>
          </div>
        </div>
      </div>

      {/* 2. 심층 분석 섹션 (인건비 & 인구통계) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>

        {/* 인건비 분석 */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <BarChart3 color="#60a5fa" />
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>인건비 및 재무 효율성</h3>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>고정급 vs 변동급(수당) 비율</h4>
            <div style={{ height: '24px', width: '100%', display: 'flex', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ width: `${(metricsData.totalBaseSalary / (metricsData.totalBaseSalary + metricsData.totalExtraPays)) * 100 || 100}%`, background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>기본급</div>
              <div style={{ width: `${(metricsData.totalExtraPays / (metricsData.totalBaseSalary + metricsData.totalExtraPays)) * 100 || 0}%`, background: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#000' }}>수당</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
              <span style={{ color: '#93c5fd' }}>{metricsData.totalBaseSalary.toLocaleString()}원</span>
              <span style={{ color: '#fcd34d' }}>{metricsData.totalExtraPays.toLocaleString()}원</span>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>직책별 평균 급여 (월)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {metricsData.positionAvg.map((pos, idx) => {
                const maxAvg = metricsData.positionAvg[0]?.avg || 1;
                const widthPercent = (pos.avg / maxAvg) * 100;
                return (
                  <div key={pos.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>{pos.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{pos.avg.toLocaleString()}원</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${widthPercent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })}
              {metricsData.positionAvg.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>데이터가 없습니다.</div>}
            </div>
          </div>
        </div>

        {/* 인구 통계 & 연차 */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <PieChart color="#34d399" />
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>조직 인구통계 및 근태</h3>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>연령대별 인원 분포</h4>
            <div style={{ display: 'flex', height: '32px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
              {Object.entries(metricsData.ageGroups).map(([age, count], idx) => {
                if (count === 0) return null;
                const pct = (count / metricsData.headcount) * 100;
                return (
                  <div key={age} style={{ width: `${pct}%`, background: ageColors[idx], borderRight: '1px solid rgba(0,0,0,0.2)' }} title={`${age}: ${count}명`} />
                )
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px' }}>
              {Object.entries(metricsData.ageGroups).map(([age, count], idx) => (
                <div key={age} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ageColors[idx] }}></div>
                  <span style={{ color: count > 0 ? 'white' : 'var(--text-secondary)' }}>{age} ({count}명)</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} color="#f472b6" />사업장별 연차 소진율 랭킹 (소진율 낮은 순)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {metricsData.wpLeaveRates.map((wp) => {
                const isDanger = wp.rate < 30; // 소진율이 낮으면 경고
                return (
                  <div key={wp.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: isDanger ? '#f87171' : 'white' }}>{wp.name} {isDanger && '🔥'}</span>
                      <span style={{ fontWeight: 'bold' }}>{wp.rate.toFixed(1)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${wp.rate}%`, height: '100%', background: isDanger ? '#ef4444' : '#34d399', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                )
              })}
              {metricsData.wpLeaveRates.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>데이터가 없습니다.</div>}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
