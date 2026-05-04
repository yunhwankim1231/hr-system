import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { FileSearch, Printer, Download, UserCircle, Calendar } from 'lucide-react';

export default function IncomeReporting() {
  const { employees, payrollArchives, company } = useAppContext();
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [viewGroup, setViewGroup] = useState('all'); // all | earnings | deductions

  // 선택된 연도의 마감 기록만 필터링
  const yearlyArchives = useMemo(() => {
    return payrollArchives.filter(p => p.year === targetYear).sort((a, b) => a.month - b.month);
  }, [payrollArchives, targetYear]);

  // 검색어에 따른 직원 필터링
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(q) || 
      (emp.phone && emp.phone.includes(q))
    );
  }, [employees, searchQuery]);

  // 선택된 직원의 누적 데이터 계산
  const reportData = useMemo(() => {
    if (!selectedEmpId) return null;

    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return null;

    const monthlySummaries = yearlyArchives.map(archive => {
      const empData = archive.data.find(d => d.emp.id === selectedEmpId);
      if (!empData) return null;

      const taxableTotal = empData.taxableTotal || 0;
      // 비과세 항목 찾기 (earnings 중 isTaxFree인 것들)
      const taxFreeTotal = empData.earnings
        .filter(e => e.isTaxFree)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      return {
        month: archive.month,
        taxableTotal,
        taxFreeTotal,
        grossTotal: taxableTotal + taxFreeTotal,
        finalizedAt: archive.finalizedAt
      };
    }).filter(Boolean);

    const totals = monthlySummaries.reduce((acc, curr) => {
      acc.taxable += curr.taxableTotal;
      acc.taxFree += curr.taxFreeTotal;
      acc.gross += curr.grossTotal;
      return acc;
    }, { taxable: 0, taxFree: 0, gross: 0 });

    // 전체 마감 데이터에서 존재하는 모든 수당/공제 항목 이름 추출
    const allEarningsNames = [...new Set(yearlyArchives.flatMap(archive => 
      archive.data.find(d => d.emp.id === selectedEmpId)?.earnings.map(e => e.name) || []
    ))].filter(Boolean);

    const allDeductionNames = [...new Set(yearlyArchives.flatMap(archive => 
      archive.data.find(d => d.emp.id === selectedEmpId)?.deductions.map(e => e.name) || []
    ))].filter(Boolean);

    return {
      employee: emp,
      monthlySummaries,
      totals,
      allEarningsNames,
      allDeductionNames
    };
  }, [selectedEmpId, yearlyArchives, employees]);

  const years = [...new Set([...payrollArchives.map(p => p.year), 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2035, 2040, 2050])].sort((a, b) => b - a);

  const handlePrint = () => window.print();

  return (
    <div className="income-reporting">
      <div className="no-print">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">급여 소득 원장</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>세무 신고 및 퇴사자 보수총액 확인을 위한 누적 급여 조회</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Calendar size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} />
              <select value={targetYear} onChange={e => setTargetYear(Number(e.target.value))} style={selectStyle}>
                {years.map(y => <option key={y} value={y} style={{ background: '#0f172a' }}>{y}년도</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginRight: '8px' }}>
              <span style={{ fontSize: '12px', marginRight: '8px', color: showDetail ? 'var(--primary-color)' : 'var(--text-secondary)' }}>상세 항목 {showDetail ? 'ON' : 'OFF'}</span>
              <button 
                onClick={() => setShowDetail(!showDetail)}
                style={{ 
                  width: '36px', height: '18px', borderRadius: '10px', background: showDetail ? 'var(--primary-color)' : '#334155', 
                  border: 'none', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' 
                }}
              >
                <div style={{ 
                  width: '14px', height: '14px', background: 'white', borderRadius: '50%', position: 'absolute', 
                  top: '2px', left: showDetail ? '20px' : '2px', transition: 'all 0.2s' 
                }}></div>
              </button>
            </div>
            <button className="btn btn-outline" onClick={handlePrint} disabled={!reportData}>
              <Printer size={16} style={{ marginRight: '6px' }} /> 원장 출력
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: '24px', marginBottom: '40px' }}>
          {/* 직원 선택 리스트 */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', fontSize: '14px', fontWeight: 'bold' }}>대상 직원 선택</div>
            
            {/* 검색창 추가 */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ position: 'relative' }}>
                <FileSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="이름 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: '600px', overflowY: 'auto', flex: 1 }}>
              {filteredEmployees.length === 0 && <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>검색 결과가 없습니다.</div>}
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id} 
                  onClick={() => setSelectedEmpId(emp.id)}
                  style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: selectedEmpId === emp.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <UserCircle size={20} className={selectedEmpId === emp.id ? 'text-primary' : 'text-secondary'} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{emp.name} {emp.resignation_date && <span style={{ color: 'var(--danger-color)', fontSize: '11px' }}>(퇴사)</span>}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.employment_type} / {emp.role || '직무미지정'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 원장 상세 보기 */}
          <div className="glass-card">
            {!selectedEmpId ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <FileSearch size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <p>왼쪽 목록에서 직원을 선택하면<br/>누적 급여 소득 원장이 생성됩니다.</p>
              </div>
            ) : reportData.monthlySummaries.length === 0 ? (
              <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p><strong>{reportData.employee.name}</strong> 님의 {targetYear}년도 마감된 급여가 없습니다.<br/>급여 관리 메뉴에서 급여 마감을 먼저 진행해 주세요.</p>
              </div>
            ) : (
              <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>누적 과세 급여액</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{reportData.totals.taxable.toLocaleString()}원</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>누적 공제 총액</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{yearlyArchives.reduce((acc, curr) => {
                        const empD = curr.data.find(d => d.emp.id === selectedEmpId);
                        return acc + (empD?.totalDeductions || 0);
                      }, 0).toLocaleString()}원</div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>누적 실지급액 합계</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>{yearlyArchives.reduce((acc, curr) => {
                        const empD = curr.data.find(d => d.emp.id === selectedEmpId);
                        return acc + (empD?.netPay || 0);
                      }, 0).toLocaleString()}원</div>
                    </div>
                  </div>

                  {/* 보기 그룹 탭 */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { id: 'all', label: '전체 보기', color: 'var(--primary-color)' },
                      { id: 'earnings', label: '지급 항목만', color: '#10b981' },
                      { id: 'deductions', label: '공제 항목만', color: '#ef4444' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setViewGroup(tab.id)}
                        style={{
                          padding: '6px 12px', borderRadius: '6px', border: '1px solid ' + (viewGroup === tab.id ? tab.color : 'rgba(255,255,255,0.1)'),
                          background: viewGroup === tab.id ? tab.color : 'transparent',
                          color: viewGroup === tab.id ? 'white' : 'var(--text-secondary)',
                          fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', minWidth: showDetail ? '1200px' : 'auto' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <th style={{ ...thStyle, position: 'sticky', left: 0, zIndex: 20, background: '#1e293b' }}>지급월</th>
                          
                          {/* 지급 항목 섹션 */}
                          {(viewGroup === 'all' || viewGroup === 'earnings') && (
                            <>
                              {showDetail ? (
                                reportData.allEarningsNames.map(name => (
                                  <th key={name} style={{ ...thStyle, borderTop: '2px solid #10b981' }}>{name}</th>
                                ))
                              ) : (
                                <th style={{ ...thStyle, borderTop: '2px solid #10b981' }}>과세 급여</th>
                              )}
                              <th style={{ ...thStyle, borderTop: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>지급계</th>
                            </>
                          )}

                          {/* 공제 항목 섹션 */}
                          {(viewGroup === 'all' || viewGroup === 'deductions') && (
                            <>
                              {showDetail ? (
                                reportData.allDeductionNames.map(name => (
                                  <th key={name} style={{ ...thStyle, borderTop: '2px solid #ef4444' }}>{name}</th>
                                ))
                              ) : (
                                <th style={{ ...thStyle, borderTop: '2px solid #ef4444' }}>4대보험/소득세</th>
                              )}
                              <th style={{ ...thStyle, borderTop: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>공제계</th>
                            </>
                          )}

                          <th style={thStyle}>실지급액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlySummaries.map(s => {
                          const archive = yearlyArchives.find(a => a.month === s.month);
                          const empData = archive?.data.find(d => d.emp.id === selectedEmpId);
                          
                          return (
                            <tr key={s.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ ...tdStyle, position: 'sticky', left: 0, zIndex: 10, background: '#1e293b', fontWeight: 'bold' }}>{targetYear}년 {s.month}월</td>
                              
                              {/* 지급 데이터 */}
                              {(viewGroup === 'all' || viewGroup === 'earnings') && (
                                <>
                                  {showDetail ? (
                                    reportData.allEarningsNames.map(name => {
                                      const val = empData?.earnings.find(e => e.name === name)?.amount || 0;
                                      return <td key={name} style={tdStyle}>{val > 0 ? val.toLocaleString() : '-'}</td>;
                                    })
                                  ) : (
                                    <td style={tdStyle}>{s.taxableTotal.toLocaleString()}</td>
                                  )}
                                  <td style={{ ...tdStyle, background: 'rgba(16, 185, 129, 0.05)', fontWeight: 'bold', color: '#10b981' }}>{s.grossTotal.toLocaleString()}</td>
                                </>
                              )}

                              {/* 공제 데이터 */}
                              {(viewGroup === 'all' || viewGroup === 'deductions') && (
                                <>
                                  {showDetail ? (
                                    reportData.allDeductionNames.map(name => {
                                      const val = empData?.deductions.find(d => d.name === name)?.amount || 0;
                                      return <td key={name} style={tdStyle}>{val > 0 ? val.toLocaleString() : '-'}</td>;
                                    })
                                  ) : (
                                    <td style={tdStyle}>{empData?.totalDeductions.toLocaleString() || '0'}</td>
                                  )}
                                  <td style={{ ...tdStyle, background: 'rgba(239, 68, 68, 0.05)', fontWeight: 'bold', color: '#ef4444' }}>{empData?.totalDeductions.toLocaleString() || '0'}</td>
                                </>
                              )}

                              <td style={{ ...tdStyle, color: '#60a5fa', fontWeight: 'bold' }}>{empData?.netPay.toLocaleString() || '0'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'rgba(59, 130, 246, 0.1)', fontWeight: 'bold' }}>
                          <td style={{ ...tdStyle, position: 'sticky', left: 0, zIndex: 10, background: '#1e293b' }}>누계</td>
                          
                          {(viewGroup === 'all' || viewGroup === 'earnings') && (
                            <>
                              {showDetail ? (
                                reportData.allEarningsNames.map(name => {
                                  const sum = reportData.monthlySummaries.reduce((acc, s) => {
                                    const arch = yearlyArchives.find(a => a.month === s.month);
                                    const eData = arch?.data.find(d => d.emp.id === selectedEmpId);
                                    return acc + (eData?.earnings.find(e => e.name === name)?.amount || 0);
                                  }, 0);
                                  return <td key={name} style={tdStyle}>{sum.toLocaleString()}</td>;
                                })
                              ) : (
                                <td style={tdStyle}>{reportData.totals.taxable.toLocaleString()}</td>
                              )}
                              <td style={tdStyle}>{reportData.totals.gross.toLocaleString()}</td>
                            </>
                          )}

                          {(viewGroup === 'all' || viewGroup === 'deductions') && (
                            <>
                              {showDetail ? (
                                reportData.allDeductionNames.map(name => {
                                  const sum = reportData.monthlySummaries.reduce((acc, s) => {
                                    const arch = yearlyArchives.find(a => a.month === s.month);
                                    const eData = arch?.data.find(d => d.emp.id === selectedEmpId);
                                    return acc + (eData?.deductions.find(d => d.name === name)?.amount || 0);
                                  }, 0);
                                  return <td key={name} style={tdStyle}>{sum.toLocaleString()}</td>;
                                })
                              ) : (
                                <td style={tdStyle}>{yearlyArchives.reduce((acc, curr) => acc + (curr.data.find(d => d.emp.id === selectedEmpId)?.totalDeductions || 0), 0).toLocaleString()}</td>
                              )}
                              <td style={tdStyle}>{yearlyArchives.reduce((acc, curr) => acc + (curr.data.find(d => d.emp.id === selectedEmpId)?.totalDeductions || 0), 0).toLocaleString()}</td>
                            </>
                          )}

                          <td style={tdStyle}>{yearlyArchives.reduce((acc, curr) => acc + (curr.data.find(d => d.emp.id === selectedEmpId)?.netPay || 0), 0).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 인쇄용 템플릿 */}
      {reportData && (
        <div className="print-only">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>급여 소득 원장</h1>
            <p>{targetYear}년 01월 ~ {targetYear}년 12월</p>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
             <tr>
               <td style={printMetaStyle}><strong>법 인 명</strong></td><td style={printValStyle}>{company.name}</td>
               <td style={printMetaStyle}><strong>성    명</strong></td><td style={printValStyle}>{reportData.employee.name}</td>
             </tr>
             <tr>
               <td style={printMetaStyle}><strong>생년월일</strong></td><td style={printValStyle}>{reportData.employee.birth_date}</td>
               <td style={printMetaStyle}><strong>입사일자</strong></td><td style={printValStyle}>{reportData.employee.join_date}</td>
             </tr>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ ...printThStyle, width: '40px' }}>귀속월</th>
                {(viewGroup === 'all' || viewGroup === 'earnings') && (
                  <>
                    {showDetail ? reportData.allEarningsNames.map(n => <th key={n} style={printThStyle}>{n}</th>) : <th style={printThStyle}>지급액</th>}
                  </>
                )}
                {(viewGroup === 'all' || viewGroup === 'deductions') && (
                  <>
                    {showDetail ? reportData.allDeductionNames.map(n => <th key={n} style={printThStyle}>{n}</th>) : <th style={printThStyle}>공제액</th>}
                  </>
                )}
                <th style={{ ...printThStyle, width: '80px' }}>실지급액</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                const s = reportData.monthlySummaries.find(x => x.month === m);
                const arch = yearlyArchives.find(a => a.month === m);
                const empD = arch?.data.find(d => d.emp.id === selectedEmpId);

                return (
                  <tr key={m}>
                    <td style={{ ...printTdStyle, textAlign: 'center' }}>{m}월</td>
                    {(viewGroup === 'all' || viewGroup === 'earnings') && (
                      <>
                        {showDetail ? (
                          reportData.allEarningsNames.map(n => <td key={n} style={printTdStyle}>{empD?.earnings.find(e => e.name === n)?.amount.toLocaleString() || '0'}</td>)
                        ) : (
                          <td style={printTdStyle}>{s?.grossTotal.toLocaleString() || '0'}</td>
                        )}
                      </>
                    )}
                    {(viewGroup === 'all' || viewGroup === 'deductions') && (
                      <>
                        {showDetail ? (
                          reportData.allDeductionNames.map(n => <td key={n} style={printTdStyle}>{empD?.deductions.find(d => d.name === n)?.amount.toLocaleString() || '0'}</td>)
                        ) : (
                          <td style={printTdStyle}>{empD?.totalDeductions.toLocaleString() || '0'}</td>
                        )}
                      </>
                    )}
                    <td style={printTdStyle}><strong>{empD?.netPay.toLocaleString() || '0'}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div style={{ marginTop: '40px', textAlign: 'right', fontSize: '14px' }}>
            <p>위와 같이 급여 소득 내역을 증명합니다.</p>
            <p style={{ marginTop: '20px' }}>{new Date().toLocaleDateString()}</p>
            <p style={{ marginTop: '20px', fontWeight: 'bold', fontSize: '18px' }}>{company.name} 대표이사 (인)</p>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle = { background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' };
const thStyle = { padding: '12px 16px', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' };
const printMetaStyle = { border: '1px solid #000', padding: '8px', background: '#f3f4f6', textAlign: 'center', width: '20%' };
const printValStyle = { border: '1px solid #000', padding: '8px', width: '30%' };
const printThStyle = { border: '1px solid #000', padding: '8px', textAlign: 'center' };
const printTdStyle = { border: '1px solid #000', padding: '8px', textAlign: 'right' };
