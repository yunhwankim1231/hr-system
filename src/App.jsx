import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Payslips from './pages/Payslips';
import LeaveManagement from './pages/LeaveManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import PayrollManagement from './pages/PayrollManagement';
import CertificateIssue from './pages/CertificateIssue';
import DailyWorkerManagement from './pages/DailyWorkerManagement.jsx';
import IncomeReporting from './pages/IncomeReporting';
import SeveranceManagement from './pages/SeveranceManagement';
import YearEndTaxManagement from './pages/YearEndTaxManagement';
import WithholdingTaxLedger from './pages/WithholdingTaxLedger';
import WithholdingTaxReceipt from './pages/WithholdingTaxReceipt';
import Login from './pages/Login';
import KeyMetrics from './pages/KeyMetrics';
import { LayoutDashboard, FileText, CalendarDays, Users, Calculator, Stamp, Construction, FileSearch, Banknote, ClipboardList, FileCheck, Printer, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, X, Plus, LogOut, TrendingUp, Image, Upload, Trash2 } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';

function CategoryManager({ label, items, onAdd, onRemove, onReorder }) {
  const [newItem, setNewItem] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) { alert('\uc774\ubbf8 \uc874\uc7ac\ud558\ub294 \ud56d\ubaa9\uc785\ub2c8\ub2e4.'); return; }
    onAdd(trimmed);
    setNewItem('');
  };
  const handleDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return; }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(null); setOverIdx(null);
  };
  const tagBase = { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', color: '#93c5fd', cursor: 'grab', userSelect: 'none', transition: 'transform 0.15s, opacity 0.15s' };
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())} placeholder={`새 ${label} 입력`} style={modalInputStyle} />
        <button type="button" onClick={handleAdd} className="btn btn-primary" style={{ padding: '8px 14px', flexShrink: 0 }}><Plus size={16} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
        {items.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{'등록된 항목이 없습니다.'}</span>}
        {items.map((item, idx) => (
          <span key={item} draggable onDragStart={() => setDragIdx(idx)} onDragOver={(e) => { e.preventDefault(); setOverIdx(idx); }} onDragEnd={() => { setDragIdx(null); setOverIdx(null); }} onDrop={() => handleDrop(idx)}
            style={{ ...tagBase, opacity: dragIdx === idx ? 0.4 : 1, transform: overIdx === idx && dragIdx !== idx ? 'scale(1.08)' : 'scale(1)', borderColor: overIdx === idx && dragIdx !== idx ? '#60a5fa' : 'rgba(59,130,246,0.3)', boxShadow: overIdx === idx && dragIdx !== idx ? '0 0 8px rgba(96,165,250,0.4)' : 'none' }}>
            {'⣿'} {item}
            <button type="button" onClick={() => onRemove(item)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.8)', cursor: 'pointer', padding: 0, lineHeight: 1 }}><X size={14} /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const { company, setCompany, employeeCategories, setEmployeeCategories, employees, session, logout } = useAppContext();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFormsOpen, setIsFormsOpen] = useState(
    ['/payslips', '/income-reporting', '/withholding-ledger', '/withholding-receipt', '/certificates'].includes(location.pathname)
  );
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('company');
  const [editingCompany, setEditingCompany] = useState({ ...company });
  const [editingCategories, setEditingCategories] = useState({ ...employeeCategories });

  const mainMenuItems = [
    { path: '/', label: '대시보드', icon: LayoutDashboard },
    { path: '/metrics', label: '주요 지표', icon: TrendingUp },
    { path: '/employees', label: '임직원 관리', icon: Users },
    { path: '/payroll', label: '급여 관리', icon: Calculator },
    { path: '/daily-workers', label: '일용직 관리', icon: Construction },
    { path: '/leave', label: '연차 관리', icon: CalendarDays },
    { path: '/severance', label: '퇴직금 관리', icon: Banknote },
    { path: '/year-end-tax', label: '연말정산 관리', icon: FileCheck },
  ];

  const formMenuItems = [
    { path: '/payslips', label: '급여 명세서', icon: FileText },
    { path: '/income-reporting', label: '급여 소득 원장', icon: FileSearch },
    { path: '/withholding-ledger', label: '원천징수부', icon: ClipboardList },
    { path: '/withholding-receipt', label: '원천징수 영수증', icon: FileCheck },
    { path: '/certificates', label: '재직/경력 증명서 발급', icon: Stamp },
  ];

  const handleSaveCompany = (e) => {
    e.preventDefault();
    setCompany(editingCompany);
    setShowSettings(false);
    alert("회사 정보가 성공적으로 업데이트되었습니다.");
  };

  const handleSaveCategories = async () => {
    const toSave = {
      workplaces: [...(editingCategories.workplaces || [])],
      roles: [...(editingCategories.roles || [])],
      positions: [...(editingCategories.positions || [])],
      banks: [...(editingCategories.banks || [])],
      approval_lines: [...(editingCategories.approval_lines || [])]
    };
    await setEmployeeCategories(toSave);
    setShowSettings(false);
    alert("직원 정보 설정이 저장되었습니다.");
  };

  const handleCategoryAdd = (field, value) => {
    setEditingCategories(prev => ({ ...prev, [field]: [...(prev[field] || []), value] }));
  };

  const handleCategoryRemove = (field, value) => {
    const usedBy = employees.filter(e => {
      if (field === 'workplaces') return e.workplace === value;
      if (field === 'roles') return e.role === value;
      if (field === 'positions') return e.position === value;
      if (field === 'banks') return e.bank_name === value;
      return false;
    });
    if (usedBy.length > 0 && !window.confirm(`"${value}" 항목은 현재 ${usedBy.length}명의 직원이 사용 중입니다.\n삭제하시겠습니까?`)) return;
    setEditingCategories(prev => ({ ...prev, [field]: (prev[field] || []).filter(i => i !== value) }));
  };

  const handleCategoryReorder = (field, newOrder) => {
    setEditingCategories(prev => ({ ...prev, [field]: newOrder }));
  };

  const openSettings = (tab = 'company') => {
    setEditingCompany({ ...company });
    setEditingCategories({ ...employeeCategories });
    setSettingsTab(tab);
    setShowSettings(true);
  };

  return (
    <div className="app-container">
      <nav className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-container">
            <div className="brand-logo">MJ</div>
            <div className="brand-name">HR & PAYROLL</div>
          </div>
          <button className="sidebar-collapse-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} title={isSidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"}>
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <ul className="sidebar-nav" style={{ flex: 1 }}>
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`} title={isSidebarCollapsed ? item.label : ''}>
                  <Icon size={20} /><span>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li style={{ marginTop: '16px' }}>
            <button onClick={() => { if (isSidebarCollapsed) setIsSidebarCollapsed(false); setIsFormsOpen(!isFormsOpen); }} className="nav-link" style={{ width: '100%', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'space-between', alignItems: 'center', border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }} title={isSidebarCollapsed ? '양식 출력' : ''}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Printer size={20} />{!isSidebarCollapsed && <span style={{ fontWeight: 'bold' }}>양식 출력</span>}</div>
              {!isSidebarCollapsed && (isFormsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            </button>
            {isFormsOpen && !isSidebarCollapsed && (
              <ul style={{ listStyle: 'none', padding: '0 0 0 16px', margin: '4px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {formMenuItems.map((item) => { const Icon = item.icon; const isActive = location.pathname === item.path; return (<li key={item.path}><Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 16px', fontSize: '14px' }}><Icon size={18} /><span>{item.label}</span></Link></li>); })}
              </ul>
            )}
          </li>
        </ul>
        <div style={{ padding: '12px', borderTop: '1px solid var(--card-border)' }}>
          <button onClick={() => openSettings('company')} className="nav-link" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }} title={isSidebarCollapsed ? "환경 설정" : ""}>
            <Settings size={20} />{!isSidebarCollapsed && <span>환경 설정</span>}
          </button>
        </div>
      </nav>
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left"><div className="topbar-title">인사 관리 시스템</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{session?.user?.email || '관리자'}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{company.name || '회사 설정 필요'}</span>
            </div>
            <button onClick={logout} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px' }}>
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </main>

      {/* 환경 설정 모달 */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '560px', maxWidth: '90%', maxHeight: '85vh', overflow: 'auto', position: 'relative', animation: 'fadeIn 0.3s ease' }}>
            <button onClick={() => setShowSettings(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 1 }}><X size={20} /></button>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Settings size={22} style={{ color: 'var(--primary-color)' }} /> 시스템 환경 설정
            </h3>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '4px', border: '1px solid var(--card-border)' }}>
              <button type="button" onClick={() => setSettingsTab('company')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: settingsTab === 'company' ? 'var(--primary-color)' : 'transparent', color: settingsTab === 'company' ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)' }}>회사 기본 정보</button>
              <button type="button" onClick={() => setSettingsTab('employee')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: settingsTab === 'employee' ? 'var(--primary-color)' : 'transparent', color: settingsTab === 'employee' ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)' }}>직원 정보 설정</button>
              <button type="button" onClick={() => setSettingsTab('approval')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: settingsTab === 'approval' ? 'var(--primary-color)' : 'transparent', color: settingsTab === 'approval' ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)' }}>결재란</button>
              <button type="button" onClick={() => setSettingsTab('seal')} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: settingsTab === 'seal' ? 'var(--primary-color)' : 'transparent', color: settingsTab === 'seal' ? 'white' : 'var(--text-secondary)', transition: 'var(--transition)' }}>직인 관리</button>
            </div>

            {/* 회사 기본 정보 탭 */}
            {settingsTab === 'company' && (
              <form onSubmit={handleSaveCompany}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={modalLabelStyle}>회사명</label>
                    <input type="text" value={editingCompany.name || ''} onChange={e => setEditingCompany({...editingCompany, name: e.target.value})} style={modalInputStyle} placeholder="회사명을 입력하세요" required />
                  </div>
                  <div>
                    <label style={modalLabelStyle}>사업자 등록번호</label>
                    <input type="text" value={editingCompany.businessNumber || ''} onChange={e => setEditingCompany({...editingCompany, businessNumber: e.target.value})} style={modalInputStyle} placeholder="000-00-00000" />
                  </div>
                  <div>
                    <label style={modalLabelStyle}>대표자명</label>
                    <input type="text" value={editingCompany.representative || ''} onChange={e => setEditingCompany({...editingCompany, representative: e.target.value})} style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={modalLabelStyle}>회사 주소</label>
                    <input type="text" value={editingCompany.address || ''} onChange={e => setEditingCompany({...editingCompany, address: e.target.value})} style={modalInputStyle} />
                  </div>
                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    * 급여명세서 및 각종 증명서 출력 시 발신인 정보로 사용됩니다.
                  </div>
                </div>
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn btn-outline" style={{ flex: 1 }}>취소</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>설정 저장</button>
                </div>
              </form>
            )}

            {/* 직원 정보 설정 탭 */}
            {settingsTab === 'employee' && (
              <div>
                <CategoryManager label="사업장" items={editingCategories.workplaces || []} onAdd={v => handleCategoryAdd('workplaces', v)} onRemove={v => handleCategoryRemove('workplaces', v)} onReorder={v => handleCategoryReorder('workplaces', v)} />
                <CategoryManager label="직무 (담당업무)" items={editingCategories.roles || []} onAdd={v => handleCategoryAdd('roles', v)} onRemove={v => handleCategoryRemove('roles', v)} onReorder={v => handleCategoryReorder('roles', v)} />
                <CategoryManager label="직책" items={editingCategories.positions || []} onAdd={v => handleCategoryAdd('positions', v)} onRemove={v => handleCategoryRemove('positions', v)} onReorder={v => handleCategoryReorder('positions', v)} />
                <CategoryManager label="급여수령 은행" items={editingCategories.banks || []} onAdd={v => handleCategoryAdd('banks', v)} onRemove={v => handleCategoryRemove('banks', v)} onReorder={v => handleCategoryReorder('banks', v)} />
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  * 여기에 등록된 항목들만 임직원 등록/수정 시 드롭다운 선택지로 제공됩니다.
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn btn-outline" style={{ flex: 1 }}>닫기</button>
                  <button type="button" onClick={handleSaveCategories} className="btn btn-primary" style={{ flex: 1 }}>설정 저장</button>
                </div>
              </div>
            )}

            {/* 결재란 설정 탭 */}
            {settingsTab === 'approval' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--primary-color)' }}>결재라인 관리</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    추후 각종 증명서, 기안서 및 휴가 신청서에 반영될 기본 결재라인(직급)을 설정합니다.
                  </p>
                  
                  <CategoryManager 
                    label="결재 직급" 
                    items={editingCategories.approval_lines || []} 
                    onAdd={v => handleCategoryAdd('approval_lines', v)} 
                    onRemove={v => handleCategoryRemove('approval_lines', v)} 
                    onReorder={v => handleCategoryReorder('approval_lines', v)} 
                  />
                  
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    * 원하는 직급을 입력하고 추가하거나, 기존 직급의 X를 눌러 뺄 수 있습니다.
                    <br />* 위아래로 드래그(Drag)하여 결재 순서를 변경할 수도 있습니다.
                  </div>

                  {/* 미리보기 섹션 */}
                  <div style={{ marginTop: '16px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--primary-color)', fontWeight: '600' }}>실제 결재란 미리보기 (문서 출력 시 형태)</h5>
                    <div style={{ 
                      overflowX: 'auto', 
                      paddingBottom: '12px', 
                      display: 'flex', 
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        border: '1px solid #444', 
                        background: '#f8f9fa', 
                        borderRadius: '2px',
                        marginLeft: 'auto', // 내용이 적을 때는 오른쪽 정렬, 많을 때는 왼쪽부터 스크롤
                        flexShrink: 0
                      }}>
                        <div style={{ 
                          width: '30px', 
                          borderRight: '1px solid #444', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          fontSize: '11px',
                          color: '#333',
                          padding: '4px',
                          writingMode: 'vertical-rl',
                          background: '#e9ecef',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}>
                          결재
                        </div>
                        {(editingCategories.approval_lines || []).map((pos, idx) => (
                          <div key={idx} style={{ 
                            width: (editingCategories.approval_lines?.length > 7) ? '55px' : '65px', 
                            borderRight: idx === (editingCategories.approval_lines?.length - 1) ? 'none' : '1px solid #444',
                            display: 'flex',
                            flexDirection: 'column',
                            flexShrink: 0
                          }}>
                            <div style={{ 
                              height: '24px', 
                              borderBottom: '1px solid #444', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              fontSize: '11px',
                              color: '#333',
                              background: '#dee2e6',
                              fontWeight: '600'
                            }}>
                              {pos}
                            </div>
                            <div style={{ height: '45px', background: 'white' }}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'right' }}>
                      * 출력물(명세서, 증명서 등) 우측 상단에 위와 같은 형태로 표시됩니다.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn btn-outline" style={{ flex: 1 }}>닫기</button>
                  <button type="button" onClick={handleSaveCategories} className="btn btn-primary" style={{ flex: 1 }}>설정 저장</button>
                </div>
              </div>
            )}

            {/* 직인 관리 탭 */}
            {settingsTab === 'seal' && (
              <div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', border: '1px solid var(--card-border)', textAlign: 'center' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', color: 'var(--primary-color)', textAlign: 'left' }}>기업 직인(인감) 등록</h4>
                  
                  <div style={{ 
                    width: '120px', 
                    height: '120px', 
                    margin: '0 auto 20px', 
                    border: '2px dashed rgba(255,255,255,0.1)', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {editingCompany.seal_url ? (
                      <>
                        <img src={editingCompany.seal_url} alt="직인" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        <button 
                          onClick={() => setEditingCompany({ ...editingCompany, seal_url: null })}
                          style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(239, 68, 68, 0.8)', border: 'none', borderRadius: '4px', color: 'white', padding: '4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Image size={32} opacity={0.3} />
                        <span style={{ fontSize: '12px' }}>이미지 없음</span>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Upload size={16} /> 이미지 업로드
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setEditingCompany({ ...editingCompany, seal_url: reader.result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'left' }}>
                    * 배경이 투명한 PNG 파일을 권장합니다. (가로세로 비율 1:1 권장)
                    <br />* 등록된 직인은 재직증명서, 경력증명서, 퇴직금 내역서 등의 하단 발행인 란에 자동으로 표시됩니다.
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn btn-outline" style={{ flex: 1 }}>취소</button>
                  <button type="submit" onClick={handleSaveCompany} className="btn btn-primary" style={{ flex: 1 }}>설정 저장</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const modalInputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '14px' };
const modalLabelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', color: 'var(--text-secondary)' };

function MainRouter() {
  const { session } = useAppContext();

  if (!session) {
    return <Login />;
  }

  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metrics" element={<KeyMetrics />} />
          <Route path="/employees" element={<EmployeeManagement />} />
          <Route path="/payroll" element={<PayrollManagement />} />
          <Route path="/daily-workers" element={<DailyWorkerManagement />} />
          <Route path="/payslips" element={<Payslips />} />
          <Route path="/income-reporting" element={<IncomeReporting />} />
          <Route path="/certificates" element={<CertificateIssue />} />
          <Route path="/leave" element={<LeaveManagement />} />
          <Route path="/severance" element={<SeveranceManagement />} />
          <Route path="/year-end-tax" element={<YearEndTaxManagement />} />
          <Route path="/withholding-ledger" element={<WithholdingTaxLedger />} />
          <Route path="/withholding-receipt" element={<WithholdingTaxReceipt />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}

export default App;
