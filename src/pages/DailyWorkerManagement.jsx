import React, { useState, useMemo } from 'react';
import { Construction, Plus, Users, Calculator, Calendar, Info, Trash2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function DailyWorkerManagement() {
  const { 
    dailyWorkers, 
    dailyWorkLogs, 
    loading, 
    addDailyWorker, 
    removeDailyWorker, 
    addWorkLog, 
    removeWorkLog, 
    updateWorkLog 
  } = useAppContext();

  const [tempInputs, setTempInputs] = useState({});
  const [activeTab, setActiveTab] = useState('attendance'); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorker, setNewWorker] = useState({ name: '', phone: '', daily_rate: '', bank: '', account: '' });
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().substring(0, 7));

  const todayLogs = useMemo(() => dailyWorkLogs.filter(log => log.work_date === selectedDate), [dailyWorkLogs, selectedDate]);

  const calculateDailyTax = (wage) => {
    const exemption = 150000;
    const taxable = Math.max(wage - exemption, 0);
    let incomeTax = Math.floor(taxable * 0.06 * 0.45 / 10) * 10;
    
    // 소액부징수 적용 (소득세 1,000원 미만 시 미징수)
    if (incomeTax < 1000) {
      incomeTax = 0;
    }
    
    const residentTax = Math.floor(incomeTax * 0.1 / 10) * 10;
    return { incomeTax, residentTax, netPay: wage - incomeTax - residentTax };
  };

  const getMonthlyStats = (workerId) => {
    const currentMonth = selectedDate.substring(0, 7);
    const monthlyLogs = dailyWorkLogs.filter(log => log.worker_id === workerId && log.work_date.startsWith(currentMonth));
    const days = monthlyLogs.length;
    const hours = monthlyLogs.reduce((acc, curr) => acc + Number(curr.hours), 0);
    return { days, hours };
  };

  const handleAddLog = async (workerId) => {
    if (todayLogs.some(l => l.worker_id === workerId)) return;
    const worker = dailyWorkers.find(w => w.id === workerId);
    const newLog = { 
      id: `LOG-${Date.now()}`, 
      worker_id: workerId, 
      work_date: selectedDate, 
      hours: 8, 
      wage: worker.daily_rate 
    };
    await addWorkLog(newLog);
  };

  const handleUpdateLog = async (logId, field, value) => {
    await updateWorkLog(logId, { [field]: value });
    // 업데이트 후 해당 임시 입력값 초기화
    setTempInputs(prev => {
      const next = { ...prev };
      delete next[`${logId}-${field}`];
      return next;
    });
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    const id = `DW-${Date.now()}`;
    await addDailyWorker({ ...newWorker, id, daily_rate: Number(newWorker.daily_rate) });
    setNewWorker({ name: '', phone: '', daily_rate: '', bank: '', account: '' });
    setShowAddWorker(false);
  };

  const handlePrint = () => { window.print(); };

  const reportData = useMemo(() => {
    const monthlyLogs = dailyWorkLogs.filter(log => log.work_date.startsWith(reportMonth));
    const summary = { totalWage: 0, totalTax: 0, totalNet: 0, totalCount: monthlyLogs.length, workerCount: new Set(monthlyLogs.map(l => l.worker_id)).size };
    const workerStats = {};

    // O(1) 조회를 위한 Map 생성
    const workerMap = dailyWorkers.reduce((acc, w) => {
      acc[w.id] = w;
      return acc;
    }, {});

    monthlyLogs.forEach(log => {
      if (!workerStats[log.worker_id]) {
        const w = workerMap[log.worker_id];
        workerStats[log.worker_id] = { name: w ? w.name : '알수없음', days: 0, hours: 0, wage: 0, tax: 0, net: 0 };
      }
      const tax = calculateDailyTax(log.wage);
      workerStats[log.worker_id].days += 1;
      workerStats[log.worker_id].hours += Number(log.hours);
      workerStats[log.worker_id].wage += log.wage;
      workerStats[log.worker_id].tax += (tax.incomeTax + tax.residentTax);
      workerStats[log.worker_id].net += tax.netPay;
      summary.totalWage += log.wage;
      summary.totalTax += (tax.incomeTax + tax.residentTax);
      summary.totalNet += tax.netPay;
    });
    return { summary, workerStats: Object.values(workerStats) };
  }, [dailyWorkLogs, reportMonth, dailyWorkers]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="text-secondary">데이터를 불러오는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="daily-worker-management" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="print-only" style={{ color: 'black', padding: '20px' }}>
        <h1 style={{ textAlign: 'center', fontSize: '24px', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
          {activeTab === 'attendance' ? `일용근로자 노무비 지급 내역서 (${selectedDate})` : `일용근로 소득 정산 리포트 (${reportMonth})`}
        </h1>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={printTh}>성명</th>
              <th style={printTh}>{activeTab === 'attendance' ? '연락처' : '근무일수'}</th>
              <th style={printTh}>{activeTab === 'attendance' ? '근무시간' : '총시간'}</th>
              <th style={printTh}>총지급액</th>
              <th style={printTh}>세금합계</th>
              <th style={printTh}>실지급액</th>
              <th style={printTh}>{activeTab === 'attendance' ? '은행/계좌' : '비고'}</th>
            </tr>
          </thead>
          <tbody>
            {(activeTab === 'attendance' ? todayLogs : reportData.workerStats).map((item, idx) => {
              if (activeTab === 'attendance') {
                const worker = dailyWorkers.find(w => w.id === item.worker_id);
                const tax = calculateDailyTax(item.wage);
                return (
                  <tr key={item.id}>
                    <td style={printTd}>{worker?.name}</td>
                    <td style={printTd}>{worker?.phone}</td>
                    <td style={printTd}>{item.hours}h</td>
                    <td style={printTd}>{item.wage.toLocaleString()}원</td>
                    <td style={printTd}>{(tax.incomeTax + tax.residentTax).toLocaleString()}원</td>
                    <td style={{ ...printTd, fontWeight: 'bold' }}>{tax.netPay.toLocaleString()}원</td>
                    <td style={printTd}>{worker?.bank} {worker?.account}</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={idx}>
                    <td style={printTd}>{item.name}</td>
                    <td style={printTd}>{item.days}일</td>
                    <td style={printTd}>{item.hours}h</td>
                    <td style={printTd}>{item.wage.toLocaleString()}원</td>
                    <td style={printTd}>{item.tax.toLocaleString()}원</td>
                    <td style={{ ...printTd, fontWeight: 'bold' }}>{item.net.toLocaleString()}원</td>
                    <td style={printTd}>-</td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>

      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">일용직 관리 시스템</h2>
            <p style={{ color: 'var(--text-secondary)' }}>실시간 클라우드 동기화 모드</p>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <button onClick={() => setActiveTab('attendance')} style={tabStyle(activeTab === 'attendance')}>출근기록</button>
            <button onClick={() => setActiveTab('workers')} style={tabStyle(activeTab === 'workers')}>인력풀 관리</button>
            <button onClick={() => setActiveTab('reports')} style={tabStyle(activeTab === 'reports')}>정산 리포트</button>
          </div>
        </div>

        {activeTab === 'attendance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px' }}>
            <div className="glass-card" style={{ height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              <div style={{ padding: '0 0 16px', borderBottom: '1px solid var(--card-border)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: 'white' }} />
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'white', fontWeight: 'bold', outline: 'none', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dailyWorkers.filter(w => !todayLogs.some(l => l.worker_id === w.id)).map(worker => (
                  <div key={worker.id} onClick={() => handleAddLog(worker.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', cursor: 'pointer' }}>
                    <div><strong>{worker.name}</strong><br/><small style={{ color: 'var(--text-secondary)' }}>{Number(worker.daily_rate).toLocaleString()}원</small></div>
                    <Plus size={16} />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: 'rgba(0,0,0,0.2)' }}><th style={thStyle}>이름</th><th style={thStyle}>시간</th><th style={thStyle}>일당</th><th style={thStyle}>세금</th><th style={thStyle}>실지급액</th><th style={thStyle}>보험</th><th style={{ ...thStyle, textAlign: 'right' }}>관리</th></tr></thead>
                  <tbody>
                    {todayLogs.map(log => {
                      const worker = dailyWorkers.find(w => w.id === log.worker_id);
                      const tax = calculateDailyTax(log.wage);
                      const stats = getMonthlyStats(log.worker_id);
                      const isTarget = stats.days >= 8 || stats.hours >= 60;
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={tdStyle}><strong>{worker?.name}</strong></td>
                          <td style={tdStyle}>
                            <input 
                              type="number" 
                              value={tempInputs[`${log.id}-hours`] ?? log.hours} 
                              onChange={e => setTempInputs({ ...tempInputs, [`${log.id}-hours`]: e.target.value })}
                              onBlur={() => tempInputs[`${log.id}-hours`] !== undefined && handleUpdateLog(log.id, 'hours', tempInputs[`${log.id}-hours`])}
                              onKeyDown={e => e.key === 'Enter' && tempInputs[`${log.id}-hours`] !== undefined && handleUpdateLog(log.id, 'hours', tempInputs[`${log.id}-hours`])}
                              style={miniInputStyle} 
                            />
                          </td>
                          <td style={tdStyle}>
                            <input 
                              type="text" 
                              value={tempInputs[`${log.id}-wage`] !== undefined ? tempInputs[`${log.id}-wage`] : Number(log.wage).toLocaleString()} 
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                setTempInputs({ ...tempInputs, [`${log.id}-wage`]: Number(val).toLocaleString() });
                              }}
                              onBlur={() => {
                                if (tempInputs[`${log.id}-wage`] !== undefined) {
                                  const numericVal = Number(tempInputs[`${log.id}-wage`].replace(/,/g, ''));
                                  handleUpdateLog(log.id, 'wage', numericVal);
                                }
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && tempInputs[`${log.id}-wage`] !== undefined) {
                                  const numericVal = Number(tempInputs[`${log.id}-wage`].replace(/,/g, ''));
                                  handleUpdateLog(log.id, 'wage', numericVal);
                                }
                              }}
                              style={{ ...miniInputStyle, width: '90px' }} 
                            />
                          </td>
                          <td style={tdStyle}><span title={`세액공제 55% 적용`} style={{ cursor: 'help', borderBottom: '1px dotted' }}>{(tax.incomeTax + tax.residentTax).toLocaleString()}원</span></td>
                          <td style={{ ...tdStyle, fontWeight: 'bold', color: 'var(--success-color)' }}>{tax.netPay.toLocaleString()}원</td>
                          <td style={tdStyle}><small style={{ color: isTarget ? 'var(--warning-color)' : 'inherit' }}>{isTarget ? '가입대상' : '미대상'}</small></td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}><button onClick={() => removeWorkLog(log.id)} style={{ color: 'var(--danger-color)', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {todayLogs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>합계: {todayLogs.reduce((acc, curr) => acc + Number(curr.wage), 0).toLocaleString()}원</strong>
                  <button className="btn btn-primary" onClick={handlePrint}>출력용 대장 생성 <ArrowRight size={16} /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'workers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px' }}>공유 인력풀 ({dailyWorkers.length}명)</h3>
              <button className="btn btn-primary" onClick={() => setShowAddWorker(true)}><Plus size={18} /> 새 인력 등록</button>
            </div>
            {showAddWorker && (
              <div className="glass-card">
                <form onSubmit={handleAddWorker} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div className="form-group"><label>이름*</label><input type="text" value={newWorker.name} onChange={e => setNewWorker({...newWorker, name: e.target.value})} style={inputStyle} required /></div>
                  <div className="form-group"><label>연락처*</label><input type="text" value={newWorker.phone} onChange={e => setNewWorker({...newWorker, phone: e.target.value})} style={inputStyle} required /></div>
                  <div className="form-group"><label>일당(원)*</label><input type="text" value={Number(newWorker.daily_rate).toLocaleString()} onChange={e => setNewWorker({...newWorker, daily_rate: e.target.value.replace(/[^0-9]/g, '')})} style={inputStyle} required /></div>
                  <div className="form-group"><label>은행명</label><input type="text" value={newWorker.bank} onChange={e => setNewWorker({...newWorker, bank: e.target.value})} style={inputStyle} /></div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}><label>계좌번호</label><input type="text" value={newWorker.account} onChange={e => setNewWorker({...newWorker, account: e.target.value})} style={inputStyle} /></div>
                  <div style={{ gridColumn: 'span 3', textAlign: 'right' }}><button type="submit" className="btn btn-primary">등록하기</button></div>
                </form>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {dailyWorkers.map(worker => (
                <div key={worker.id} className="glass-card hover-bright" style={{ position: 'relative' }}>
                  <button onClick={() => removeDailyWorker(worker.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', opacity: 0.5 }}><Trash2 size={16} /></button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', background: 'rgba(59,130,246,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={20} /></div>
                    <div><h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>{worker.name}</h4><p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{worker.phone}</p></div>
                  </div>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>기본 일당</span><span>{Number(worker.daily_rate).toLocaleString()}원</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}><span>계좌 정보</span><span>{worker.bank} {worker.account}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} style={{ ...inputStyle, width: '160px', marginTop: 0 }} />
               <button className="btn btn-primary" onClick={handlePrint}><Calculator size={16} style={{ marginRight: '8px' }} /> 리포트 인쇄</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
               <div className="glass-card"><strong>총 지급액</strong><div style={{ fontSize: '20px' }}>{reportData.summary.totalWage.toLocaleString()}원</div></div>
               <div className="glass-card"><strong>총 원천세</strong><div style={{ fontSize: '20px' }}>{reportData.summary.totalTax.toLocaleString()}원</div></div>
               <div className="glass-card"><strong>실지급 합계</strong><div style={{ fontSize: '20px', color: 'var(--success-color)' }}>{reportData.summary.totalNet.toLocaleString()}원</div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const tabStyle = (active) => ({ padding: '8px 24px', borderRadius: '8px', background: active ? 'var(--primary-color)' : 'transparent', color: active ? 'white' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: '600' });
const thStyle = { padding: '16px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left' };
const tdStyle = { padding: '16px', fontSize: '14px' };
const miniInputStyle = { width: '60px', padding: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', marginTop: '4px' };
const printTh = { border: '1px solid black', padding: '8px', fontSize: '12px', textAlign: 'center' };
const printTd = { border: '1px solid black', padding: '8px', fontSize: '12px', textAlign: 'center' };
