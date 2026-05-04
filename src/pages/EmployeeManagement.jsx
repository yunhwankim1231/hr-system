import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, UserMinus, Edit, X, Search, FileText, Info } from 'lucide-react';

export default function EmployeeManagement() {
  const { 
    company, 
    employees, 
    addEmployee, 
    resignEmployee, 
    cancelResignation,
    updateEmployee,
    employeeCategories,
    getEmployeeAuditLogs
  } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Audit Logs State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');       // 고용형태
  const [filterStatus, setFilterStatus] = useState('active'); // 재직/퇴사/전체
  const [filterWorkplace, setFilterWorkplace] = useState('all'); // 사업장
  const [detailEmp, setDetailEmp] = useState(null);
  const [pensionExemptWarning, setPensionExemptWarning] = useState(false);
  const [showSmeInfo, setShowSmeInfo] = useState(false);
  
  const formRef = useRef(null);

  const initialFormState = {
    name: '',
    base_salary: '',
    extra_pays: [],
    birth_date: '',
    resident_number: '',
    phone: '',
    address: '',
    employment_type: '정규직',
    join_date: '',
    probation_end_date: '',
    role: '',
    position: '',
    workplace: '',
    bank_name: '',
    account_number: '',
    has_irp_account: false,
    irp_account_number: '',
    irp_provider: '',
    dependents: 1,
    children_count: 0,
    income_tax_rate: 100,
    work_hours: 8,
    is_sme_exemption: false,
    sme_exemption_rate: 90,
    employee_id: '',
    resignation_date: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showAuditModal) {
          setShowAuditModal(false);
        } else if (detailEmp) {
          setDetailEmp(null);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuditModal, detailEmp]);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    // 급여 금액 콤마 서식
    if (name === 'base_salary') {
      const numericVal = value.replace(/[^0-9]/g, '');
      value = numericVal ? Number(numericVal).toLocaleString() : '';
    }
    
    // 주민등록번호 포맷팅 및 생년월일 자동 산출
    if (name === 'resident_number') {
      const numericVal = value.replace(/[^0-9]/g, '');
      const limitedVal = numericVal.slice(0, 13);
      
      // 하이픈 추가
      if (limitedVal.length <= 6) {
        value = limitedVal;
      } else {
        value = `${limitedVal.slice(0, 6)}-${limitedVal.slice(6)}`;
      }

      // 생년월일 자동 계산
      if (limitedVal.length >= 7) {
        const yy = limitedVal.slice(0, 2);
        const mm = limitedVal.slice(2, 4);
        const dd = limitedVal.slice(4, 6);
        const genderCode = limitedVal.charAt(6);
        
        let century = '19';
        if (['3', '4', '7', '8'].includes(genderCode)) {
          century = '20';
        } else if (['9', '0'].includes(genderCode)) {
          century = '18';
        }
        
        const calculatedBirth = `${century}${yy}-${mm}-${dd}`;

        // 만 60세 이상 여부 판단
        const today = new Date();
        const birth = new Date(calculatedBirth);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        setPensionExemptWarning(age >= 60);

        setFormData(prev => ({ ...prev, [name]: value, birth_date: calculatedBirth }));
        return;
      }
    }

    // 연락처 하이픈 자동 서식
    if (name === 'phone') {
      const numericVal = value.replace(/[^0-9]/g, '');
      if (numericVal.length <= 3) {
        value = numericVal;
      } else if (numericVal.length <= 7) {
        value = `${numericVal.slice(0, 3)}-${numericVal.slice(3)}`;
      } else {
        value = `${numericVal.slice(0, 3)}-${numericVal.slice(3, 7)}-${numericVal.slice(7, 11)}`;
      }
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditMode(false);
    setEditingId(null);
    setShowForm(false);
    setPensionExemptWarning(false);
  };

  const openAddForm = () => {
    setFormData(initialFormState);
    setEditMode(false);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (emp) => {
    setFormData({
      name: emp.name,
      base_salary: emp.base_salary ? Number(emp.base_salary).toLocaleString() : '',
      extra_pays: emp.extra_pays ? emp.extra_pays.map(ep => ({ ...ep, amount: ep.amount ? Number(ep.amount).toLocaleString() : '' })) : [],
      birth_date: emp.birth_date,
      resident_number: (emp.resident_number === '000000-0000000' ? '' : emp.resident_number) || '',
      phone: emp.phone || '',
      address: emp.address || '',
      employment_type: emp.employment_type,
      join_date: emp.join_date,
      probation_end_date: emp.probation_end_date || '',
      role: emp.role || '',
      position: emp.position || '',
      workplace: emp.workplace || '',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      has_irp_account: emp.has_irp_account || false,
      irp_account_number: emp.irp_account_number || '',
      irp_provider: emp.irp_provider || '',
      dependents: emp.dependents || 1,
      children_count: emp.children_count || 0,
      income_tax_rate: emp.income_tax_rate || 100,
      work_hours: emp.work_hours ?? 8,
      is_sme_exemption: emp.is_sme_exemption || false,
      sme_exemption_rate: emp.sme_exemption_rate || 90,
      employee_id: emp.employee_id || '',
      resignation_date: emp.resignation_date || ''
    });

    // 편집 시 만 60세 이상 여부 판단
    if (emp.birth_date) {
      const today = new Date();
      const birth = new Date(emp.birth_date);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      setPensionExemptWarning(age >= 60);
    } else {
      setPensionExemptWarning(false);
    }
    setEditMode(true);
    setEditingId(emp.id);
    setShowForm(true);
    
    // Smooth scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.base_salary || !formData.resident_number || !formData.join_date) {
      alert("이름, 주민등록번호, 계약 기본급, 입사일은 필수 항목입니다.");
      return;
    }
    
    // 주민등록번호 중복 검사
    const isDuplicate = employees.some(emp => 
      emp.resident_number === formData.resident_number && 
      (!editMode || emp.id !== editingId)
    );

    if (isDuplicate) {
      alert("이미 등록된 주민등록번호입니다. 확인 후 다시 입력해주세요.");
      return;
    }
    
    // extra_pays 빈 값 필터링 및 숫자 변환
    const cleanedExtraPays = formData.extra_pays
      .filter(ep => ep.name)
      .map(ep => ({ name: ep.name, amount: Number(String(ep.amount).replace(/[^0-9]/g, '')) || 0, isTaxFree: !!ep.isTaxFree }));

    const payload = {
      ...formData,
      base_salary: Number(String(formData.base_salary).replace(/[^0-9]/g, '')),
      dependents: Number(formData.dependents) || 1,
      children_count: Number(formData.children_count) || 0,
      extra_pays: cleanedExtraPays,
      is_sme_exemption: formData.is_sme_exemption,
      sme_exemption_rate: Number(formData.sme_exemption_rate),
      irp_provider: formData.has_irp_account ? formData.irp_provider : '',
      irp_account_number: formData.has_irp_account ? formData.irp_account_number : '',
      probation_end_date: formData.probation_end_date || null
    };

    if (editMode && editingId) {
      updateEmployee(editingId, payload);
    } else {
      addEmployee(payload);
    }
    
    resetForm();
  };

  const handleExtraPayChange = (index, field, value) => {
    const newExtraPays = [...formData.extra_pays];
    if (field === 'amount') {
      const numericVal = value.replace(/[^0-9]/g, '');
      newExtraPays[index][field] = numericVal ? Number(numericVal).toLocaleString() : '0';
    } else {
      newExtraPays[index][field] = value;
    }
    setFormData({ ...formData, extra_pays: newExtraPays });
  };

  const addExtraPayRow = () => {
    setFormData({
      ...formData,
      extra_pays: [...formData.extra_pays, { name: '', amount: '', isTaxFree: false }]
    });
  };

  const removeExtraPayRow = (index) => {
    const newExtraPays = [...formData.extra_pays];
    newExtraPays.splice(index, 1);
    setFormData({ ...formData, extra_pays: newExtraPays });
  };

  const handleResign = (empId, currentResignDate) => {
    if (currentResignDate) {
      alert("이미 퇴사 처리된 직원입니다.");
      return;
    }
    const resignDate = prompt("퇴사일을 입력해주세요. (YYYY-MM-DD)");
    if (resignDate) {
      resignEmployee(empId, resignDate);
    }
  };

  const handleOpenAuditLogs = async (empId) => {
    setLoadingAudit(true);
    setShowAuditModal(true);
    const logs = await getEmployeeAuditLogs(empId);
    setAuditLogs(logs);
    setLoadingAudit(false);
  };

  // 사업장 목록: 환경 설정 기반 + 기존 데이터에만 있는 값 병합
  const categoryWorkplaces = employeeCategories?.workplaces || [];
  const existingWorkplaces = [...new Set(employees.map(e => e.workplace).filter(Boolean))];
  const workplaceList = [...new Set([...categoryWorkplaces, ...existingWorkplaces])];

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // 텍스트 검색 (이름, 연락처, 직무, 직책)
      const q = searchQuery.toLowerCase();
      const matchesText = !q || 
        emp.name.toLowerCase().includes(q) || 
        (emp.phone && emp.phone.includes(q)) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.position && emp.position.toLowerCase().includes(q)) ||
        emp.employment_type.includes(q);

      // 고용형태 필터
      const matchesType = filterType === 'all' || emp.employment_type === filterType;

      // 재직상태 필터
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? !emp.resignation_date :
        !!emp.resignation_date;

      // 사업장 필터
      const matchesWorkplace = filterWorkplace === 'all' || (emp.workplace || '') === filterWorkplace;

      return matchesText && matchesType && matchesStatus && matchesWorkplace;
    });
  }, [employees, searchQuery, filterType, filterStatus, filterWorkplace]);

  return (
    <div className="employee-management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800' }} className="text-gradient">임직원 관리</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="이름, 직무, 직책 검색" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, marginTop: 0, paddingLeft: '36px', width: '220px', background: 'rgba(0,0,0,0.3)' }}
            />
          </div>
          {!showForm && (
            <button className="btn btn-primary" onClick={openAddForm} style={{ whiteSpace: 'nowrap' }}>
              <UserPlus size={18} /> 신규 입사자 등록
            </button>
          )}
        </div>
      </div>

      {/* 필터 바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={filterSelectStyle}>
          <option value="active" style={optStyle}>재직자만</option>
          <option value="resigned" style={optStyle}>퇴사자만</option>
          <option value="all" style={optStyle}>전체 (재직+퇴사)</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={filterSelectStyle}>
          <option value="all" style={optStyle}>고용형태 전체</option>
          <option value="정규직" style={optStyle}>정규직</option>
          <option value="계약직" style={optStyle}>계약직</option>
          <option value="파트타임" style={optStyle}>파트타임</option>
          <option value="인턴" style={optStyle}>인턴</option>
        </select>
        {workplaceList.length > 0 && (
          <select value={filterWorkplace} onChange={e => setFilterWorkplace(e.target.value)} style={filterSelectStyle}>
            <option value="all" style={optStyle}>사업장 전체</option>
            {workplaceList.map(wp => (
              <option key={wp} value={wp} style={optStyle}>{wp}</option>
            ))}
          </select>
        )}
        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-secondary)' }}>
          검색 결과: <strong style={{ color: 'var(--primary-color)' }}>{filteredEmployees.length}</strong>명
          {(searchQuery || filterType !== 'all' || filterStatus !== 'active' || filterWorkplace !== 'all') && (
            <button 
              onClick={() => { setSearchQuery(''); setFilterType('all'); setFilterStatus('active'); setFilterWorkplace('all'); }}
              style={{ marginLeft: '8px', fontSize: '12px', color: '#60a5fa', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              필터 초기화
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div ref={formRef} className="glass-card" style={{ marginBottom: '24px', animation: 'fadeIn 0.3s ease', position: 'relative' }}>
          <button 
            onClick={resetForm} 
            style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>
              {editMode ? '직원 정보 수정' : '신규 입사자 정보 입력'}
            </h3>
            {editMode && (
              <button 
                type="button" 
                onClick={() => handleOpenAuditLogs(editingId)} 
                className="btn btn-outline" 
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <FileText size={14} /> 변경 이력 조회
              </button>
            )}
          </div>
          <form onSubmit={handleFormSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>이름 (성명)*</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={inputStyle} required />
            </div>
            <div className="form-group">
              <label>주민등록번호*</label>
              <input 
                type="text" 
                name="resident_number" 
                value={formData.resident_number} 
                onChange={handleInputChange} 
                style={inputStyle} 
                placeholder="예: 900101-1234567" 
                required 
              />
            </div>
            {pensionExemptWarning && (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '13px',
                color: '#fbbf24'
              }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div>
                  <strong>국민연금 공제 대상이 아닙니다.</strong>
                  <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
                    만 60세 이상 근로자는 국민연금 의무가입 대상에서 제외됩니다. (국민연금법 제6조)
                  </span>
                </div>
              </div>
            )}
            <div className="form-group">
              <label>연락처</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} style={inputStyle} placeholder="예: 010-0000-0000" />
            </div>
            <div className="form-group">
              <label>거주지 주소</label>
              <input type="text" name="address" value={formData.address} onChange={handleInputChange} style={inputStyle} placeholder="거주지 주소 입력" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>사업장</label>
                <select name="workplace" value={formData.workplace} onChange={handleInputChange} style={inputStyle}>
                  <option value="" style={optStyle}>-- 선택 --</option>
                  {(employeeCategories?.workplaces || []).map(wp => <option key={wp} value={wp} style={optStyle}>{wp}</option>)}
                  {formData.workplace && !(employeeCategories?.workplaces || []).includes(formData.workplace) && <option value={formData.workplace} style={optStyle}>{formData.workplace} (미등록)</option>}
                </select>
              </div>
              <div className="form-group">
                <label>직무 (담당업무)</label>
                <select name="role" value={formData.role} onChange={handleInputChange} style={inputStyle}>
                  <option value="" style={optStyle}>-- 선택 --</option>
                  {(employeeCategories?.roles || []).map(r => <option key={r} value={r} style={optStyle}>{r}</option>)}
                  {formData.role && !(employeeCategories?.roles || []).includes(formData.role) && <option value={formData.role} style={optStyle}>{formData.role} (미등록)</option>}
                </select>
              </div>
              <div className="form-group">
                <label>직책</label>
                <select name="position" value={formData.position} onChange={handleInputChange} style={inputStyle}>
                  <option value="" style={optStyle}>-- 선택 --</option>
                  {(employeeCategories?.positions || []).map(p => <option key={p} value={p} style={optStyle}>{p}</option>)}
                  {formData.position && !(employeeCategories?.positions || []).includes(formData.position) && <option value={formData.position} style={optStyle}>{formData.position} (미등록)</option>}
                </select>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>급여 수령 은행</label>
                <select name="bank_name" value={formData.bank_name} onChange={handleInputChange} style={inputStyle}>
                  <option value="" style={optStyle}>-- 선택 --</option>
                  {(employeeCategories?.banks || []).map(b => <option key={b} value={b} style={optStyle}>{b}</option>)}
                  {formData.bank_name && !(employeeCategories?.banks || []).includes(formData.bank_name) && <option value={formData.bank_name} style={optStyle}>{formData.bank_name} (미등록)</option>}
                </select>
              </div>
              <div className="form-group">
                <label>계좌번호</label>
                <input type="text" name="account_number" value={formData.account_number} onChange={handleInputChange} style={inputStyle} placeholder="숫자 및 대시(-) 입력 가능" />
              </div>
            </div>
            <div className="form-group">
              <label>부양가족 수 (본인 포함)</label>
              <input type="number" min="1" name="dependents" value={formData.dependents} onChange={handleInputChange} style={inputStyle} placeholder="예: 기본 1명" />
            </div>
            <div className="form-group">
              <label>8세~20세 자녀 수 (세액공제 대상)</label>
              <input type="number" min="0" name="children_count" value={formData.children_count} onChange={handleInputChange} style={inputStyle} placeholder="예: 0명" />
            </div>
            <div className="form-group">
              <label>소득세 징수 비율</label>
              <select name="income_tax_rate" value={formData.income_tax_rate} onChange={handleInputChange} style={inputStyle}>
                <option value={80} style={optStyle}>80% (적게 원천징수)</option>
                <option value={100} style={optStyle}>100% (표준)</option>
                <option value={120} style={optStyle}>120% (많이 원천징수)</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', background: 'rgba(96, 165, 250, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: formData.has_irp_account ? '16px' : '0' }}>
                <input 
                  type="checkbox" 
                  id="has_irp_account"
                  checked={formData.has_irp_account} 
                  onChange={e => setFormData({ ...formData, has_irp_account: e.target.checked })} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="has_irp_account" style={{ margin: 0, fontWeight: '600', color: '#60a5fa', cursor: 'pointer' }}>퇴직연금(IRP) 계좌 보유</label>
              </div>
              
              {formData.has_irp_account && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>IRP 운영기관</label>
                    <input 
                      type="text" 
                      name="irp_provider"
                      value={formData.irp_provider} 
                      onChange={handleInputChange} 
                      style={inputStyle} 
                      placeholder="예: 삼성생명, 신한은행" 
                    />
                  </div>
                  <div className="form-group">
                    <label>IRP 계좌번호</label>
                    <input 
                      type="text" 
                      name="irp_account_number"
                      value={formData.irp_account_number} 
                      onChange={handleInputChange} 
                      style={inputStyle} 
                      placeholder="계좌번호 입력" 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 중소기업 취업자 소득세 감면 설정 */}
            <div style={{ gridColumn: '1 / -1', background: 'rgba(167, 139, 250, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.1)', marginTop: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id="is_sme_exemption"
                    checked={formData.is_sme_exemption} 
                    onChange={e => setFormData({ ...formData, is_sme_exemption: e.target.checked })} 
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="is_sme_exemption" style={{ margin: 0, fontWeight: '600', color: '#a78bfa', cursor: 'pointer' }}>중소기업 취업자 소득세 감면 대상</label>
                </div>
                
                <button 
                  type="button" 
                  onClick={() => setShowSmeInfo(!showSmeInfo)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  <Info size={14} /> 제도 알아보기
                </button>
              </div>

              {showSmeInfo && (
                <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.6', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#a78bfa' }}>💡 중소기업 취업자 소득세 감면 제도 안내</p>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.8)' }}>• <strong>청년(15~34세):</strong> 5년간 소득세 90% 감면</p>
                  <p style={{ margin: '0 0 4px 0', color: 'rgba(255,255,255,0.8)' }}>• <strong>고령자/장애인/경력단절:</strong> 3년간 소득세 70% 감면</p>
                  <p style={{ margin: '0 0 12px 0', color: 'rgba(255,255,255,0.8)' }}>• <strong>한도:</strong> 연간 최대 200만 원</p>
                  <a 
                    href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=40632&cntntsId=239023" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'underline', fontWeight: '500' }}
                  >
                    👉 국세청 공식 안내 페이지에서 자세히 보기
                  </a>
                </div>
              )}

              {formData.is_sme_exemption && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>적용 감면율 선택:</label>
                  <select 
                    name="sme_exemption_rate" 
                    value={formData.sme_exemption_rate} 
                    onChange={handleInputChange} 
                    style={{ ...inputStyle, width: 'auto', marginTop: 0 }}
                  >
                    <option value={90}>90% (청년, 5년)</option>
                    <option value={70}>70% (고령자/장애인/경력단절여성, 3년)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>계약 기본급 (원)*</label>
              <input type="text" name="base_salary" value={formData.base_salary} onChange={handleInputChange} style={inputStyle} placeholder="예: 3,000,000" required />
            </div>
            <div className="form-group">
              <label>고용 형태*</label>
              <select name="employment_type" value={formData.employment_type} onChange={handleInputChange} style={inputStyle}>
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="아르바이트">아르바이트</option>
              </select>
            </div>
            <div className="form-group">
              <label>입사일 (YYYY-MM-DD)*</label>
              <input type="date" name="join_date" value={formData.join_date} onChange={handleInputChange} style={inputStyle} required />
            </div>
            <div className="form-group">
              <label>수습 종료 예정일 (선택)</label>
              <input type="date" name="probation_end_date" value={formData.probation_end_date} onChange={handleInputChange} style={inputStyle} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label>추가 수당 내역</label>
                <button type="button" onClick={addExtraPayRow} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '12px' }}>
                  + 수당 항목 추가
                </button>
              </div>
              {formData.extra_pays.length === 0 && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>설정된 추가 수당이 없습니다.</div>
              )}
              {formData.extra_pays.map((ep, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 150px 80px auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="text" value={ep.name} onChange={(e) => handleExtraPayChange(idx, 'name', e.target.value)} style={inputStyle} placeholder="수당명 (예: 식대)" />
                  <input type="text" value={ep.amount} onChange={(e) => handleExtraPayChange(idx, 'amount', e.target.value)} style={inputStyle} placeholder="금액 (원)" />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={ep.isTaxFree} 
                      onChange={(e) => handleExtraPayChange(idx, 'isTaxFree', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    비과세
                  </label>
                  <button type="button" onClick={() => removeExtraPayRow(idx)} className="btn btn-outline" style={{ border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--danger-color)', padding: '6px' }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '16px', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary">{editMode ? '수정 완료' : '등록 완료'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--card-border)' }}>
            <tr>
              <th style={thStyle}>이름</th>
              <th style={thStyle}>연락처</th>
              <th style={thStyle}>고용형태</th>
              <th style={thStyle}>사업장</th>
              <th style={thStyle}>직무/직책</th>
              <th style={thStyle}>입사일</th>
              <th style={thStyle}>상태(퇴사일)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: emp.resignation_date ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                <td style={tdStyle}>
                  <strong 
                    style={{ cursor: 'pointer', color: '#60a5fa', textDecoration: 'underline', transition: 'color 0.2s' }} 
                    onClick={() => setDetailEmp(emp)}
                    title="클릭하여 상세 정보 보기"
                  >
                    {emp.name}
                  </strong><br/>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.birth_date} 생</span>
                </td>
                <td style={tdStyle}>
                  {(() => {
                    if (!emp.phone) return '-';
                    const cleaned = emp.phone.replace(/[^0-9]/g, '');
                    if (cleaned.length === 11) {
                      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
                    } else if (cleaned.length === 10) {
                      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
                    }
                    return emp.phone;
                  })()}<br/>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '150px', display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.address}
                  </span>
                </td>
                <td style={tdStyle}>{emp.employment_type}</td>
                <td style={tdStyle}>{emp.workplace || '-'}</td>
                <td style={tdStyle}>
                  {emp.role || '-'}<br/>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.position || ''}</span>
                </td>
                <td style={tdStyle}>{emp.join_date}</td>
                <td style={tdStyle}>
                  {emp.resignation_date ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'var(--danger-color)', fontSize: '13px' }}>퇴사 ({emp.resignation_date})</span>
                      <button 
                        onClick={() => { if(window.confirm(`${emp.name}님의 퇴사 처리를 취소하고 재직 중으로 변경하시겠습니까?`)) cancelResignation(emp.id); }}
                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                      >
                        퇴사 취소 (재직 복구)
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--success-color)', fontSize: '13px' }}>재직중</span>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    <button 
                      onClick={() => openEditForm(emp)}
                      className="btn btn-outline" 
                      style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.2)' }}
                      title="직원 정보 수정"
                    >
                      <Edit size={14} /> 편집
                    </button>
                    {!emp.resignation_date && (
                      <button 
                        onClick={() => handleResign(emp.id, emp.resignation_date)}
                        className="btn btn-outline" 
                        style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid rgba(239, 68, 68, 0.4)', color: 'var(--danger-color)' }}
                        title="퇴사 처리"
                      >
                        <UserMinus size={14} /> 퇴사
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Log Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '700px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowAuditModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} /> 데이터 변경 이력 (Audit Logs)
            </h3>
            
            {loadingAudit ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>불러오는 중...</div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>변경 이력이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {auditLogs.map((log) => {
                  const dt = new Date(log.created_at);
                  const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                  
                  const changes = [];
                  if (log.action === 'UPDATE' && log.old_data && log.new_data) {
                    for (const key in log.new_data) {
                      if (log.old_data[key] !== log.new_data[key] && key !== 'updated_at') {
                        if (typeof log.new_data[key] !== 'object') {
                          changes.push({ key, oldVal: log.old_data[key], newVal: log.new_data[key] });
                        }
                      }
                    }
                  }

                  return (
                    <div key={log.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 'bold', color: log.action === 'INSERT' ? '#10b981' : log.action === 'UPDATE' ? '#3b82f6' : '#ef4444' }}>
                          [{log.action}] {log.changed_by_email ? `${log.changed_by_email} 님이 수정함` : ''}
                        </span>
                        <span>{dateStr}</span>
                      </div>
                      
                      {log.action === 'UPDATE' && changes.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                          {changes.map(c => (
                            <li key={c.key}>
                              <strong>{c.key}</strong>: <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>{c.oldVal === null || c.oldVal === '' ? '(없음)' : String(c.oldVal)}</span> ➔ <span style={{ color: '#60a5fa' }}>{c.newVal === null || c.newVal === '' ? '(없음)' : String(c.newVal)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : log.action === 'UPDATE' ? (
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>상세 변경 내역 없음 (또는 복합 데이터 변경)</div>
                      ) : (
                        <div style={{ fontSize: '14px' }}>
                          {log.action === 'INSERT' ? '직원 데이터 최초 등록' : '직원 데이터 삭제'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 임직원 상세 정보 모달 */}
      {detailEmp && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setDetailEmp(null)}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width: '420px', maxWidth: '90%', position: 'relative', animation: 'fadeIn 0.2s ease' }}>
            <button 
              onClick={() => setDetailEmp(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {detailEmp.name} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{detailEmp.employment_type}</span>
            </h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              {detailEmp.position ? `${detailEmp.position}` : ''}{detailEmp.role && detailEmp.position ? ' / ' : ''}{detailEmp.role ? `${detailEmp.role}` : '직무 미지정'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', fontSize: '14px' }}>
              <div style={detailRowStyle}><span>생년월일</span><strong>{detailEmp.birth_date}</strong></div>
              <div style={detailRowStyle}><span>주민등록번호</span><strong>{detailEmp.resident_number && detailEmp.resident_number !== '000000-0000000' ? detailEmp.resident_number.substring(0, 8) + '******' : '-'}</strong></div>
              <div style={detailRowStyle}><span>연락처</span><strong>{detailEmp.phone || '-'}</strong></div>
              <div style={detailRowStyle}><span>거주지</span><strong style={{textAlign:'right', wordBreak:'keep-all'}}>{detailEmp.address || '-'}</strong></div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
              <div style={detailRowStyle}><span>입사일</span><strong>{detailEmp.join_date}</strong></div>
              <div style={detailRowStyle}><span>사업장</span><strong>{detailEmp.workplace || '-'}</strong></div>
              {detailEmp.resignation_date && <div style={detailRowStyle}><span>퇴사일</span><strong style={{color:'var(--danger-color)'}}>{detailEmp.resignation_date}</strong></div>}
              {detailEmp.probation_end_date && <div style={detailRowStyle}><span>수습 종료일</span><strong>{detailEmp.probation_end_date}</strong></div>}
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
              <div style={detailRowStyle}><span>급여 수령 은행</span><strong>{detailEmp.bank_name || '-'}</strong></div>
              <div style={detailRowStyle}><span>수령 계좌번호</span><strong>{detailEmp.account_number || '-'}</strong></div>
              <div style={{ borderTop: '1px dashed rgba(96, 165, 250, 0.2)', margin: '4px 0' }}></div>
              <div style={detailRowStyle}><span>IRP 계좌 여부</span><strong style={{ color: detailEmp.has_irp_account ? '#60a5fa' : 'inherit' }}>{detailEmp.has_irp_account ? '보유' : '미보유'}</strong></div>
              {detailEmp.has_irp_account && (
                <>
                  <div style={detailRowStyle}><span>IRP 기관</span><strong>{detailEmp.irp_provider || '-'}</strong></div>
                  <div style={detailRowStyle}><span>IRP 계좌번호</span><strong>{detailEmp.irp_account_number || '-'}</strong></div>
                </>
              )}
              <div style={detailRowStyle}><span>부양가족 수</span><strong>{detailEmp.dependents || 1}명 (본인 포함)</strong></div>
              <div style={detailRowStyle}>
                <span>소득세 감면 적용</span>
                <strong style={{ color: detailEmp.is_sme_exemption ? '#60a5fa' : 'inherit' }}>
                  {detailEmp.is_sme_exemption ? `적용 중 (${detailEmp.sme_exemption_rate}%)` : '미적용'}
                </strong>
              </div>
              <div style={detailRowStyle}><span>소득세 징수 비율</span><strong>{detailEmp.income_tax_rate || 100}%</strong></div>
              <div style={detailRowStyle}><span>계약 기본급</span><strong style={{ color: 'var(--primary-color)' }}>{Number(detailEmp.base_salary).toLocaleString()}원</strong></div>
              
              {detailEmp.extra_pays && detailEmp.extra_pays.length > 0 && (
                <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>추가 수당 내역 (항목 당)</div>
                  {detailEmp.extra_pays.map((ep, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{ep.name}</span><strong>{Number(ep.amount).toLocaleString()}원</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button className="btn btn-outline" onClick={() => { setDetailEmp(null); openEditForm(detailEmp); }} style={{ marginRight: '8px' }}>
                정보 수정하기
              </button>
              <button className="btn btn-primary" onClick={() => setDetailEmp(null)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const detailRowStyle = {
  display: 'flex', 
  justifyContent: 'space-between',
  color: 'var(--text-primary)'
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  marginTop: '6px',
  outline: 'none'
};

const thStyle = {
  padding: '16px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  fontSize: '14px',
  whiteSpace: 'nowrap'
};

const tdStyle = {
  padding: '16px',
  fontSize: '14px'
};

const filterSelectStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(0,0,0,0.3)',
  color: 'white',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer'
};

const optStyle = {
  background: '#0f172a',
  color: 'white'
};
