import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Payslips from './pages/Payslips';
import LeaveManagement from './pages/LeaveManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import PayrollManagement from './pages/PayrollManagement';
import CertificateIssue from './pages/CertificateIssue';
import DailyWorkerManagement from './pages/DailyWorkerManagement.jsx';
import IncomeReporting from './pages/IncomeReporting';
import { LayoutDashboard, FileText, CalendarDays, Users, Calculator, Stamp, Construction, FileSearch } from 'lucide-react';
import { AppProvider } from './context/AppContext';

function AppLayout({ children }) {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: '대시보드', icon: LayoutDashboard },
    { path: '/employees', label: '임직원 관리', icon: Users },
    { path: '/payroll', label: '급여 관리', icon: Calculator },
    { path: '/daily-workers', label: '일용직 관리', icon: Construction },
    { path: '/payslips', label: '급여 명세서', icon: FileText },
    { path: '/income-reporting', label: '급여 소득 원장', icon: FileSearch },
    { path: '/certificates', label: '증명서 발급', icon: Stamp },
    { path: '/leave', label: '연차 관리', icon: CalendarDays },
  ];

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">AG</div>
          <div className="brand-name">HR & PAYROLL</div>
        </div>
        <ul className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link to={item.path} className={`nav-link ${isActive ? 'active' : ''}`}>
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">인사 관리 시스템</div>
          <div className="topbar-user">관리자 계정</div>
        </header>
        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

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
          </Routes>
        </AppLayout>
      </Router>
    </AppProvider>
  );
}

export default App;
