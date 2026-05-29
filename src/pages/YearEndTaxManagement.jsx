import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../utils/supabaseClient';
import { 
  Users, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  FileText, 
  ChevronRight,
  Calculator,
  Calendar,
  Banknote,
  Info
} from 'lucide-react';

export default function YearEndTaxManagement() {
  const { employees } = useAppContext();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [activeStatus, setActiveStatus] = useState('대기');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [activeTab, setActiveTab] = useState('기본/인적공제');
  const [taxFormData, setTaxFormData] = useState({
    income_deductions: { 
      credit_card: '', 
      debit_card: '', 
      book_perf: '', 
      market: '', 
      transport: '',
      housing: '', 
      health_ins: '' 
    },
    tax_exemptions: { 
      medical: { general: '', infertility: '', premature: '', indemnity: '' }, 
      education: '', 
      donation: '', 
      pension: '', 
      insurance: '',
      monthly_rent: '',
      is_married_this_year: false
    }
  });

  useEffect(() => {
    // 직원이 바뀔 때마다 폼과 탭 초기화
    setTaxFormData({
      income_deductions: { 
        credit_card: '', 
        debit_card: '', 
        book_perf: '', 
        market: '', 
        transport: '',
        housing: '', 
        health_ins: '' 
      },
      tax_exemptions: { 
        medical: { general: '', infertility: '', premature: '', indemnity: '' }, 
        education: '', 
        donation: '', 
        pension: '', 
        insurance: '',
        monthly_rent: '',
        is_married_this_year: false
      }
    });
    setActiveTab('기본/인적공제');
  }, [selectedEmployeeId]);

  const handleTaxInputChange = (section, field, value) => {
    // 중첩 경로 처리 (예: field=['medical', 'general'])
    if (Array.isArray(field)) {
      const numericValue = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value;
      setTaxFormData(prev => {
        const newSection = { ...prev[section] };
        let current = newSection;
        for (let i = 0; i < field.length - 1; i++) {
          current[field[i]] = { ...current[field[i]] };
          current = current[field[i]];
        }
        current[field[field.length - 1]] = numericValue;
        return { ...prev, [section]: newSection };
      });
      return;
    }

    const val = typeof value === 'string' && field !== 'is_married_this_year' ? value.replace(/[^0-9]/g, '') : value;
    setTaxFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: val
      }
    }));
  };

  // 더미 상태 데이터
  const settlementStatusMap = useMemo(() => {
    const map = {};
    employees.forEach(emp => {
      const hash = emp.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      if (hash % 3 === 0) map[emp.id] = '대기';
      else if (hash % 3 === 1) map[emp.id] = '진행중';
      else map[emp.id] = '완료';
    });
    return map;
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const statusMatch = settlementStatusMap[emp.id] === activeStatus;
      const searchMatch = emp.name.includes(searchTerm) || (emp.workplace || '').includes(searchTerm);
      return statusMatch && searchMatch;
    });
  }, [employees, activeStatus, searchTerm, settlementStatusMap]);

  const selectedEmployee = useMemo(() => 
    employees.find(e => e.id === selectedEmployeeId), 
  [employees, selectedEmployeeId]);

  const statusCounts = useMemo(() => {
    const counts = { '대기': 0, '진행중': 0, '완료': 0 };
    Object.values(settlementStatusMap).forEach(s => counts[s]++);
    return counts;
  }, [settlementStatusMap]);

  // 실시간 세액 계산 엔진 (국세청 세법 정밀 반영)
  const calculateYearEndTax = (formData, empData) => {
    // [기초 데이터] 총급여 및 기납부세액
    const totalPay = Number(empData.base_salary * 12);
    const prePaidTax = 0; // 기납부세액 (소득세) - 추후 연동 필요
    const prePaidLocalTax = 0; // 기납부세액 (지방소득세)

    // 1. 근로소득공제 계산 (총급여액 구간별 공제율 적용)
    let laborDeduction = 0;
    if (totalPay <= 5000000) laborDeduction = totalPay * 0.7;
    else if (totalPay <= 15000000) laborDeduction = 3500000 + (totalPay - 5000000) * 0.4;
    else if (totalPay <= 45000000) laborDeduction = 7500000 + (totalPay - 15000000) * 0.15;
    else if (totalPay <= 100000000) laborDeduction = 12000000 + (totalPay - 45000000) * 0.05;
    else laborDeduction = 14750000 + (totalPay - 100000000) * 0.02;

    const laborIncomeAmount = totalPay - laborDeduction;

    // 2. 종합소득 과세표준 산출 (소득공제 항목 차감)
    // [신용카드 등 소득공제 정밀 계산 - 25% 문턱 및 차등 공제율]
    const ccThreshold = totalPay * 0.25; 
    let remainingThreshold = ccThreshold;
    const inc = formData.income_deductions;
    
    // 공제율이 낮은 항목부터 문턱값을 채우는 방식 (신용카드 -> 직불 -> 도서공연 -> 전통시장 -> 대중교통)
    const calcCCDeduction = (amount, rate) => {
      const val = Number(amount || 0);
      const afterThreshold = Math.max(0, val - remainingThreshold);
      remainingThreshold = Math.max(0, remainingThreshold - val);
      return afterThreshold * rate;
    };

    let creditCardDeduction = 0;
    creditCardDeduction += calcCCDeduction(inc.credit_card, 0.15); // 신용카드 (15%)
    creditCardDeduction += calcCCDeduction(inc.debit_card, 0.30);  // 직불/현금 (30%)
    creditCardDeduction += calcCCDeduction(inc.book_perf, 0.30);   // 도서/공연 (30%)
    creditCardDeduction += calcCCDeduction(inc.market, 0.40);      // 전통시장 (40%)
    creditCardDeduction += calcCCDeduction(inc.transport, 0.40);   // 대중교통 (40%)
    
    // 신용카드 소득공제 한도 적용 (300만 원)
    const finalCCDeduction = Math.min(creditCardDeduction, 3000000);

    // 기타 소득공제 (건강보험 100%, 주택임차 40%)
    const otherIncomeDeduction = Number(inc.health_ins || 0) + (Number(inc.housing || 0) * 0.4);
    
    // 기본 인적공제 (본인 및 부양가족 인당 150만원)
    const personalDeduction = (Number(empData.dependents || 1)) * 1500000;
    
    const totalIncomeDeduction = finalCCDeduction + otherIncomeDeduction + personalDeduction;
    const taxableIncome = Math.max(0, laborIncomeAmount - totalIncomeDeduction);

    // 3. 산출세액 계산 (2025 기본세율 적용)
    let calculatedTax = 0;
    if (taxableIncome <= 14000000) calculatedTax = taxableIncome * 0.06;
    else if (taxableIncome <= 50000000) calculatedTax = 840000 + (taxableIncome - 14000000) * 0.15;
    else if (taxableIncome <= 88000000) calculatedTax = 6240000 + (taxableIncome - 50000000) * 0.24;
    else if (taxableIncome <= 150000000) calculatedTax = 15360000 + (taxableIncome - 88000000) * 0.35;
    else calculatedTax = 37060000 + (taxableIncome - 150000000) * 0.38;
    
    calculatedTax = Math.floor(calculatedTax);

    // 4. 세액공제 및 감면 적용 -> 결정세액 산출
    let exemptionsSum = Number(formData.tax_exemptions.education || 0) * 0.15 + 
                        Number(formData.tax_exemptions.donation || 0) * 0.15 + 
                        Number(formData.tax_exemptions.pension || 0) * 0.12 +
                        Number(formData.tax_exemptions.insurance || 0) * 0.12;
    
    // 자녀세액공제 (2025년 개정안)
    const childrenCount = Number(empData.children_count || 0);
    if (childrenCount === 1) exemptionsSum += 250000;
    else if (childrenCount === 2) exemptionsSum += 550000;
    else if (childrenCount >= 3) exemptionsSum += 550000 + (childrenCount - 2) * 400000;

    // 혼인세액공제 (50만 원)
    if (formData.tax_exemptions.is_married_this_year) exemptionsSum += 500000;

    // 월세액 세액공제 (한도 1,000만 원)
    const rentPaid = Math.min(10000000, Number(formData.tax_exemptions.monthly_rent || 0));
    if (totalPay <= 55000000) exemptionsSum += rentPaid * 0.17;
    else if (totalPay <= 80000000) exemptionsSum += rentPaid * 0.15;

    // 의료비 세액공제 (실손보험 차감 및 700만 원 한도 적용)
    const med = formData.tax_exemptions.medical;
    const medThreshold = totalPay * 0.03;
    let currentIndemnity = Number(med.indemnity || 0);
    let currentThreshold = medThreshold;

    const calcMedExcessAmount = (val) => {
      let base = Math.max(0, Number(val || 0) - currentIndemnity);
      currentIndemnity = Math.max(0, currentIndemnity - Number(val || 0));
      let excess = Math.max(0, base - currentThreshold);
      currentThreshold = Math.max(0, currentThreshold - base);
      return excess;
    };

    // 일반 의료비는 700만 원 한도 적용 후 15% 공제
    const generalMedExcess = Math.min(calcMedExcessAmount(med.general), 7000000);
    exemptionsSum += generalMedExcess * 0.15;
    
    // 특정 의료비(미숙아 20%, 난임 30%)는 한도 없음
    exemptionsSum += calcMedExcessAmount(med.premature) * 0.20;
    exemptionsSum += calcMedExcessAmount(med.infertility) * 0.30;
    
    // 중소기업 취업자 소득세 감면 (최대 200만 원)
    let smeExemptionAmount = 0;
    if (empData.is_sme_exemption) {
      const rate = (empData.sme_exemption_rate || 90) / 100;
      smeExemptionAmount = Math.min(2000000, Math.floor(Math.max(0, calculatedTax - exemptionsSum) * rate));
    }

    const finalTax = Math.max(0, calculatedTax - exemptionsSum - smeExemptionAmount);
    const finalLocalTax = Math.floor(finalTax * 0.1);

    // 5. 최종 차감징수세액 산출
    const refundOrPayIncome = finalTax - prePaidTax;
    const refundOrPayLocal = finalLocalTax - prePaidLocalTax;

    return {
      totalPay,
      laborDeduction,
      laborIncomeAmount,
      taxableIncome,
      calculatedTax,
      exemptionsSum,
      finalTax,
      finalLocalTax,
      smeExemptionAmount,
      prePaidTax,
      prePaidLocalTax,
      refundOrPayIncome,
      refundOrPayLocal,
      refundOrPay: refundOrPayIncome + refundOrPayLocal
    };
  };

  const liveTaxResult = useMemo(() => {
    if (!selectedEmployee) return null;
    return calculateYearEndTax(taxFormData, selectedEmployee);
  }, [selectedEmployee, taxFormData]);

  const handleSaveData = async (isDraft = true) => {
    if (!selectedEmployee || !liveTaxResult) return;
    try {
      const { error } = await supabase
        .from('year_end_tax_settlements')
        .upsert({
          employee_id: selectedEmployee.id,
          target_year: selectedYear,
          status: isDraft ? '진행중' : '대기',
          total_pay: liveTaxResult.totalPay,
          pre_paid_tax: liveTaxResult.prePaidTax,
          income_deductions_json: taxFormData.income_deductions,
          tax_exemptions_json: taxFormData.tax_exemptions,
          calculated_tax: liveTaxResult.calculatedTax,
          final_tax: liveTaxResult.finalTax,
          refund_or_pay: liveTaxResult.refundOrPay
        }, { onConflict: 'employee_id, target_year' });

      if (error) throw error;
      alert(isDraft ? "입력하신 내용이 임시 저장되었습니다." : "정산 결과가 저장되었습니다.");
    } catch (err) {
      console.error("저장 중 오류:", err);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleFinalizeSettlement = async () => {
    if (!selectedEmployee || !liveTaxResult) return;

    const nextYearFeb = `${selectedYear + 1}-02`;
    const confirmMsg = `연말정산을 마감하고 차감징수세액을 ${nextYearFeb} 급여에 반영하시겠습니까?\n마감 후에는 데이터를 수정할 수 없습니다.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. 연말정산 상태 업데이트 (완료)
      const { error: settlementError } = await supabase
        .from('year_end_tax_settlements')
        .upsert({
          employee_id: selectedEmployee.id,
          target_year: selectedYear,
          status: '완료',
          total_pay: liveTaxResult.totalPay,
          pre_paid_tax: liveTaxResult.prePaidTax,
          income_deductions_json: taxFormData.income_deductions,
          tax_exemptions_json: taxFormData.tax_exemptions,
          calculated_tax: liveTaxResult.calculatedTax,
          final_tax: liveTaxResult.finalTax,
          refund_or_pay: liveTaxResult.refundOrPay
        }, { onConflict: 'employee_id, target_year' });

      if (settlementError) throw settlementError;

      // 2. 2월 급여 내역 조회 및 반영
      const { data: existingSlip, error: fetchError } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', selectedEmployee.id)
        .eq('payment_month', nextYearFeb)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const yearEndIncome = liveTaxResult.refundOrPayIncome;
      const yearEndResident = liveTaxResult.refundOrPayLocal;

      if (existingSlip) {
        // 기존 명세서가 있으면 업데이트
        const newTotalDeductions = Number(existingSlip.total_deductions || 0) + yearEndIncome + yearEndResident;
        const newNetPay = Number(existingSlip.net_pay || 0) - (yearEndIncome + yearEndResident);

        await supabase
          .from('payslips')
          .update({
            year_end_tax_income: yearEndIncome,
            year_end_tax_resident: yearEndResident,
            total_deductions: newTotalDeductions,
            net_pay: newNetPay,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSlip.id);
      } else {
        // 명세서가 없으면 신규 생성 (Draft)
        // 기본급 등은 employees 정보에서 가져옴
        const baseSalary = selectedEmployee.base_salary || 0;
        const totalDeductions = yearEndIncome + yearEndResident;
        const netPay = baseSalary - totalDeductions;

        await supabase
          .from('payslips')
          .insert({
            employee_id: selectedEmployee.id,
            payment_month: nextYearFeb,
            base_salary: baseSalary,
            year_end_tax_income: yearEndIncome,
            year_end_tax_resident: yearEndResident,
            total_deductions: totalDeductions,
            net_pay: netPay,
            status: 'Draft'
          });
      }

      alert("성공적으로 마감 및 2월 급여 반영이 완료되었습니다.");
      // 상태 갱신을 위해 페이지를 새로고침하거나 상태를 업데이트하는 로직이 필요할 수 있음
      window.location.reload(); 

    } catch (err) {
      console.error("마감 처리 중 오류:", err);
      alert("마감 처리 중 오류가 발생했습니다: " + err.message);
    }
  };

  const tabs = ['기본/인적공제', '소득공제', '세액공제/감면', '정산 결과 미리보기'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: 'calc(100vh - 140px)' }}>
      {/* 왼쪽: 마스터 */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>귀속 연도 선택</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={iconInInputStyle} />
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ ...selectStyle, paddingLeft: '36px' }}>
              {[0, 1, 2].map(offset => {
                const y = new Date().getFullYear() - offset;
                return <option key={y} value={y}>{y}년 귀속</option>;
              })}
            </select>
          </div>
        </div>

        <div style={tabContainerStyle}>
          {['대기', '진행중', '완료'].map(status => (
            <button key={status} onClick={() => setActiveStatus(status)} style={{ ...statusTabStyle, background: activeStatus === status ? 'var(--primary-color)' : 'transparent', color: activeStatus === status ? 'white' : 'var(--text-secondary)' }}>
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input type="text" placeholder="직원명 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ ...inputStyle, paddingLeft: '34px', fontSize: '13px' }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>해당하는 직원이 없습니다.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredEmployees.map(emp => (
                <div key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)} style={{ ...listCardStyle, background: selectedEmployeeId === emp.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedEmployeeId === emp.id ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{emp.name}</span>
                    <StatusBadge status={settlementStatusMap[emp.id]} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.workplace} | {emp.position}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 디테일 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingBottom: '80px' }}>
        {!selectedEmployee ? (
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '50%', marginBottom: '20px' }}><User size={64} opacity={0.2} /></div>
            <p style={{ fontSize: '16px' }}>왼쪽 목록에서 연말정산을 진행할 직원을 선택해 주세요.</p>
          </div>
        ) : (
          <>
            <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={avatarStyle}><User size={28} /></div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{selectedEmployee.name} <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({selectedEmployee.position})</span></h2>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedEmployee.workplace} · {selectedEmployee.role}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={smallLabelStyle}>연간 총급여액</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{liveTaxResult?.totalPay.toLocaleString()}원</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={smallLabelStyle}>기납부세액 (소득세)</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>0원</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                   <StatusBadge status={settlementStatusMap[selectedEmployee.id]} large />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ ...navTabStyle, background: activeTab === tab ? 'rgba(255,255,255,0.05)' : 'transparent', color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)', borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : 'none' }}>
                  {tab}
                </button>
              ))}
            </div>

            <div className="glass-card" style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
              {activeTab === '기본/인적공제' && (
                <div style={formContainerStyle}>
                  <SectionTitle title="기본 인적 사항" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <InfoField label="성명" value={selectedEmployee.name} />
                    <InfoField label="주민등록번호" value={selectedEmployee.resident_number ? `${selectedEmployee.resident_number.substring(0, 8)}******` : '미등록'} />
                    <InfoField label="부양가족 수" value={`${selectedEmployee.dependents || 1}명`} />
                    <InfoField label="자녀 수 (8~20세)" value={`${selectedEmployee.children_count || 0}명`} />
                  </div>
                  <SectionTitle title="특수 감면 사항" />
                  <div style={smeCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#60a5fa' }}>중소기업 취업자 소득세 감면</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>직원 정보에서 설정된 감면율이 적용됩니다.</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {selectedEmployee.is_sme_exemption ? (
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>적용 중 ({selectedEmployee.sme_exemption_rate}%)</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>미적용</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '소득공제' && (
                <div style={formContainerStyle}>
                  <SectionTitle title="주요 소득공제 항목 입력 (신용카드 등)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <TaxInput 
                      label="신용카드 사용액" 
                      value={taxFormData.income_deductions.credit_card} 
                      onChange={(val) => handleTaxInputChange('income_deductions', 'credit_card', val)} 
                      tooltip="총급여액의 25%를 초과하는 사용 금액에 대해 15% 소득공제 적용"
                    />
                    <TaxInput 
                      label="직불카드 / 현금영수증" 
                      value={taxFormData.income_deductions.debit_card} 
                      onChange={(val) => handleTaxInputChange('income_deductions', 'debit_card', val)} 
                      tooltip="총급여액의 25%를 초과하는 사용 금액에 대해 30% 소득공제 적용"
                    />
                    <TaxInput 
                      label="도서/공연/미술관/영화관람/수영장/체력단련장" 
                      value={taxFormData.income_deductions.book_perf} 
                      onChange={(val) => handleTaxInputChange('income_deductions', 'book_perf', val)} 
                      tooltip="총급여 7천만 원 이하 대상. 2025년 7월부터 수영장/헬스장 이용료 포함 (30% 공제)"
                    />
                    <TaxInput 
                      label="전통시장 사용액" 
                      value={taxFormData.income_deductions.market} 
                      onChange={(val) => handleTaxInputChange('income_deductions', 'market', val)} 
                      tooltip="전통시장 사용액에 대해 40% (연도별 한시적 상향 적용 가능) 소득공제 적용"
                    />
                    <TaxInput 
                      label="대중교통 이용액" 
                      value={taxFormData.income_deductions.transport} 
                      onChange={(val) => handleTaxInputChange('income_deductions', 'transport', val)} 
                      tooltip="대중교통 이용액에 대해 40% (연도별 한시적 상향 적용 가능) 소득공제 적용"
                    />
                  </div>
                  
                  <div style={{ marginTop: '12px' }}>
                    <SectionTitle title="기타 소득공제" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '16px' }}>
                      <TaxInput 
                        label="주택임차(전월세) 차입금 원리금 상환액" 
                        value={taxFormData.income_deductions.housing} 
                        onChange={(val) => handleTaxInputChange('income_deductions', 'housing', val)} 
                        tooltip="주택임차차입금(전세자금대출) 원리금 상환액의 40% 공제 (주택마련저축 합산 연 400만원 한도)"
                      />
                      <TaxInput 
                        label="건강/고용보험료 납입액" 
                        value={taxFormData.income_deductions.health_ins} 
                        onChange={(val) => handleTaxInputChange('income_deductions', 'health_ins', val)} 
                        tooltip="근로자가 직접 부담한 건강보험료, 장기요양보험료, 고용보험료 전액 소득공제"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '세액공제/감면' && (
                <div style={formContainerStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#60a5fa' }}>혼인세액공제 (신설)</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>2024~2026년 중 혼인신고를 한 경우 50만 원 세액공제</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={taxFormData.tax_exemptions.is_married_this_year} 
                      onChange={(e) => handleTaxInputChange('tax_exemptions', 'is_married_this_year', e.target.checked)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                  </div>

                  <SectionTitle title="의료비 세액공제 (세분화)" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <TaxInput 
                      label="일반 의료비" 
                      value={taxFormData.tax_exemptions.medical.general} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', ['medical', 'general'], val)} 
                      tooltip="본인, 65세 이상, 장애인 외 부양가족을 위해 지출한 일반 의료비"
                    />
                    <TaxInput 
                      label="실손의료보험금 수령액 (차감)" 
                      value={taxFormData.tax_exemptions.medical.indemnity} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', ['medical', 'indemnity'], val)} 
                      tooltip="보험회사로부터 수령한 실손보험금은 의료비 지출액에서 반드시 차감해야 함"
                    />
                    <TaxInput 
                      label="난임시술비" 
                      value={taxFormData.tax_exemptions.medical.infertility} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', ['medical', 'infertility'], val)} 
                      tooltip="난임시술을 위해 지출한 비용 (30% 세액공제 적용)"
                    />
                    <TaxInput 
                      label="미숙아 / 선천성이상아 의료비" 
                      value={taxFormData.tax_exemptions.medical.premature} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', ['medical', 'premature'], val)} 
                      tooltip="미숙아 및 선천성이상아 치료를 위해 지출한 비용 (20% 세액공제 적용)"
                    />
                  </div>

                  <SectionTitle title="월세액 및 기타 세액공제" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <TaxInput 
                      label="월세액 납입액" 
                      value={taxFormData.tax_exemptions.monthly_rent} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', 'monthly_rent', val)} 
                      tooltip="총급여 8천만 원 이하 무주택 세대주 대상 (최대 17% 세액공제)"
                    />
                    <TaxInput 
                      label="교육비 지출액" 
                      value={taxFormData.tax_exemptions.education} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', 'education', val)} 
                      tooltip="본인 및 부양가족을 위해 지출한 교육비의 15% 세액공제"
                    />
                    <TaxInput 
                      label="보장성 보험료" 
                      value={taxFormData.tax_exemptions.insurance} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', 'insurance', val)} 
                      tooltip="보장성 보험료 납입액(연 100만원 한도)의 12% 세액공제 적용"
                    />
                    <TaxInput 
                      label="기부금 납입액" 
                      value={taxFormData.tax_exemptions.donation} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', 'donation', val)} 
                      tooltip="기부금 유형에 따라 15~30% 세액공제 적용"
                    />
                    <TaxInput 
                      label="연금계좌/IRP 납입액" 
                      value={taxFormData.tax_exemptions.pension} 
                      onChange={(val) => handleTaxInputChange('tax_exemptions', 'pension', val)} 
                      tooltip="연금저축 및 IRP 납입액의 12~15% 세액공제"
                    />
                  </div>
                </div>
              )}

              {activeTab === '정산 결과 미리보기' && liveTaxResult && (
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <SectionTitle title="연말정산 결과 영수증" />
                  <div style={receiptStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <ResultRow label="연간 총급여액" value={liveTaxResult.totalPay} />
                      <ResultRow label="(-) 근로소득공제" value={liveTaxResult.laborDeduction} isDeduction />
                      <div style={dividerStyle} />
                      <ResultRow label="(=) 근로소득금액" value={liveTaxResult.laborIncomeAmount} highlight />
                      <ResultRow label="(-) 소득공제 합계" value={liveTaxResult.taxableIncome - liveTaxResult.laborIncomeAmount} isDeduction />
                      <div style={dividerStyle} />
                      <ResultRow label="(=) 과세표준" value={liveTaxResult.taxableIncome} highlight />
                      <div style={dividerStyle} />
                      <ResultRow label="산출세액" value={liveTaxResult.calculatedTax} />
                      <ResultRow label="(-) 세액공제 합계" value={liveTaxResult.exemptionsSum} isDeduction />
                      <ResultRow label="(-) 세액감면 (중소기업)" value={liveTaxResult.smeExemptionAmount} isDeduction />
                      <div style={dividerStyle} />
                      <ResultRow label="(=) 결정세액 (소득세)" value={liveTaxResult.finalTax} highlight />
                      <ResultRow label="(=) 결정세액 (지방소득세)" value={liveTaxResult.finalLocalTax} highlight />
                      <div style={dividerStyle} />
                      <ResultRow label="기납부세액 합계" value={liveTaxResult.prePaidTax + liveTaxResult.prePaidLocalTax} isDeduction />
                      <div style={{ height: '2px', background: 'var(--primary-color)', margin: '16px 0', opacity: 0.3 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>차감징수세액 합계</span>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: liveTaxResult.refundOrPay <= 0 ? '#60a5fa' : '#ef4444' }}>
                          {liveTaxResult.refundOrPay.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={floatingBarStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>예상 차감징수세액:</span>
                <span style={{ fontSize: '22px', fontWeight: 'bold', color: (liveTaxResult?.refundOrPay || 0) <= 0 ? '#60a5fa' : '#ef4444' }}>
                  {(liveTaxResult?.refundOrPay || 0).toLocaleString()}원
                </span>
                <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: (liveTaxResult?.refundOrPay || 0) <= 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: (liveTaxResult?.refundOrPay || 0) <= 0 ? '#60a5fa' : '#ef4444' }}>
                  {(liveTaxResult?.refundOrPay || 0).toLocaleString() <= 0 ? '환급액' : '추가 납부액'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* 1. 가장 약한 액션 (임시 저장) */}
                <button className="btn btn-outline" onClick={() => handleSaveData(true)}>
                  임시 저장
                </button>

                {/* 2. 중간 액션 (결과 저장) */}
                <button className="btn btn-primary" style={{ padding: '10px 32px' }} onClick={() => handleSaveData(false)}>
                  정산 결과 저장하기
                </button>

                {/* 3. 돌이킬 수 없는 최종 액션 (마감 및 급여 반영 - 가장 오른쪽 배치) */}
                <button 
                  onClick={handleFinalizeSettlement} 
                  className="btn" 
                  disabled={settlementStatusMap[selectedEmployee.id] === '완료'}
                  style={{ 
                    background: settlementStatusMap[selectedEmployee.id] === '완료' ? '#ccc' : '#10b981', 
                    color: 'white', 
                    padding: '10px 32px',
                    cursor: settlementStatusMap[selectedEmployee.id] === '완료' ? 'not-allowed' : 'pointer',
                    opacity: settlementStatusMap[selectedEmployee.id] === '완료' ? 0.6 : 1
                  }}
                >
                  {settlementStatusMap[selectedEmployee.id] === '완료' ? '마감 완료됨' : '마감 및 2월 급여 반영'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper Components
function SectionTitle({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
      <div style={{ width: '4px', height: '16px', background: 'var(--primary-color)', borderRadius: '2px' }} />
      <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{title}</h4>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div style={smallLabelStyle}>{label}</div>
      <div style={readOnlyFieldStyle}>{value}</div>
    </div>
  );
}

function TaxInput({ label, value, onChange, tooltip }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</label>
        {tooltip && (
          <span title={tooltip} style={{ display: 'inline-flex', cursor: 'help' }}>
            <Info size={14} color="var(--text-secondary)" />
          </span>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <input type="text" value={Number(value || 0).toLocaleString()} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, textAlign: 'right', paddingRight: '40px' }} />
        <span style={unitStyle}>원</span>
      </div>
    </div>
  );
}

function ResultRow({ label, value, isDeduction, highlight, isSub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isSub ? 0.6 : 1, paddingLeft: isSub ? '12px' : '0' }}>
      <span style={{ fontSize: highlight ? '16px' : '14px', fontWeight: highlight ? 'bold' : 'normal' }}>{label}</span>
      <span style={{ fontSize: highlight ? '18px' : '15px', fontWeight: 'bold', color: isDeduction ? '#fca5a5' : 'white' }}>
        {isDeduction && value > 0 ? '-' : ''}{Number(value || 0).toLocaleString()}원
      </span>
    </div>
  );
}

function StatusBadge({ status, large }) {
  const styles = {
    '대기': { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', icon: Clock },
    '진행중': { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: AlertCircle },
    '완료': { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: CheckCircle },
  };
  const { bg, color, icon: Icon } = styles[status];
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: large ? '6px 12px' : '3px 8px', borderRadius: '20px', background: bg, color: color, fontSize: large ? '13px' : '11px', fontWeight: 'bold', border: `1px solid ${color}33` }}>
      <Icon size={large ? 14 : 10} /> {status}
    </div>
  );
}

// Styles
const selectStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px', outline: 'none', cursor: 'pointer' };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' };
const smallLabelStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' };
const iconInInputStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-color)' };
const tabContainerStyle = { display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px' };
const statusTabStyle = { flex: 1, padding: '8px 0', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' };
const listCardStyle = { padding: '12px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' };
const avatarStyle = { width: '50px', height: '50px', borderRadius: '12px', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' };
const navTabStyle = { padding: '10px 20px', borderRadius: '10px 10px 0 0', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' };
const formContainerStyle = { display: 'flex', flexDirection: 'column', gap: '24px' };
const readOnlyFieldStyle = { padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' };
const smeCardStyle = { background: 'rgba(59, 130, 246, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)' };
const unitStyle = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-secondary)' };
const receiptStyle = { background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px' };
const dividerStyle = { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' };
const floatingBarStyle = { position: 'absolute', bottom: '0', left: '0', right: '0', height: '80px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', zIndex: 10, borderRadius: '0 0 16px 16px' };
