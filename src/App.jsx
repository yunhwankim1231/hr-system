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
import WithholdingTaxLedger from './pages/WithholdingTaxLedger';
import WithholdingTaxReceipt from './pages/WithholdingTaxReceipt';
import { LayoutDashboard, FileText, CalendarDays, Users, Calculator, Stamp, Construction, FileSearch, Banknote, ClipboardList, FileCheck, Printer, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, X, Plus } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';

function CategoryManager({ label, items, onAdd, onRemove }) {
  const [newItem, setNewItem] = useState('');
  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) { alert('이미 존재하는 항목입니다.'); return; }
    onAdd(trimmed);
    setNewItem('');
  };
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd())} placeholder={`새 ${label} 입력`} style={modalInputStyle} />
        <button type="button" onClick={handleAdd} className="btn btn-primary" style={{ padding: '8px 14px', flexShrink: 0 }}><Plus size={16} /></button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '32px' }}>
        {items.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>등록된 항목이 없습니다.</span>}
        {items.map(item => (
          <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', color: '#93c5fd' }}>
            {item}
            <button type="button" onClick={() => onRemove(item)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.8)', cursor: 'pointer', padding: 0, lineHeight: 1 }}><X size={14} /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function AppLayout({ children }) {
  const location = useLocation();
  const { company, setCompany, employeeCategories, setEmployeeCategories, employees } = useAppContext();
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
    { path: '/employees', label: '임직원 관리', icon: Users },
    { path: '/payroll', label: '급여 관리', icon: Calculator },
    { path: '/daily-workers', label: '일용직 관리', icon: Construction },
    { path: '/leave', label: '연차 관리', icon: CalendarDays },
    { path: '/severance', label: '퇴직금 관리', icon: Banknote },
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
      banks: [...(editingCategories.banks || [])]
    };
    await setEmployeeCategories(toSave);
    setShowSettings(false);
    alert("직원 정보 설정이 저장되었습니다.");
  };

  const handleCategoryAdd = (field, value) => {
    setEditingCategories(prev => ({ ...prev, [field]: [...prev[field], value] }));
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
    setEditingCategories(prev => ({ ...prev, [field]: prev[field].filter(i => i !== value) }));
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
          <div className="topbar-user">관리자 계정</div>
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
                <CategoryManager label="사업장" items={editingCategories.workplaces || []} onAdd={v => handleCategoryAdd('workplaces', v)} onRemove={v => handleCategoryRemove('workplaces', v)} />
                <CategoryManager label="직무 (담당업무)" items={editingCategories.roles || []} onAdd={v => handleCategoryAdd('roles', v)} onRemove={v => handleCategoryRemove('roles', v)} />
                <CategoryManager label="직책" items={editingCategories.positions || []} onAdd={v => handleCategoryAdd('positions', v)} onRemove={v => handleCategoryRemove('positions', v)} />
                <CategoryManager label="급여수령 은행" items={editingCategories.banks || []} onAdd={v => handleCategoryAdd('banks', v)} onRemove={v => handleCategoryRemove('banks', v)} />
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  * 여기에 등록된 항목들만 임직원 등록/수정 시 드롭다운 선택지로 제공됩니다.
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="btn btn-outline" style={{ flex: 1 }}>취소</button>
                  <button type="button" onClick={handleSaveCategories} className="btn btn-primary" style={{ flex: 1 }}>설정 저장</button>
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

function App() {
  return (
    <AppProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/payroll" element={<PayrollManagement />} />
            <Route path="/daily-workers" element={<DailyWorkerManagement />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/income-reporting" element={<IncomeReporting />} />
            <Route path="/certificates" element={<CertificateIssue />} />
            <Route path="/leave" element={<LeaveManagement />} />
            <Route path="/severance" element={<SeveranceManagement />} />
            <Route path="/withholding-ledger" element={<WithholdingTaxLedger />} />
            <Route path="/withholding-receipt" element={<WithholdingTaxReceipt />} />
          </Routes>
        </AppLayout>
      </Router>
    </AppProvider>
  );
}

export default App;
