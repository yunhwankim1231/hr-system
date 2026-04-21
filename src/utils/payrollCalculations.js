import { getAge } from './getAge';

/**
 * 간이 근로소득세 근사치 산출기 (국세청 간이세액표 대용)
 * @param {number} taxableIncome - 과세 대상 급여 총액
 * @param {number} dependents - 부양가족 수 (본인 포함, 기본값 1)
 * 
 * 인적공제: 부양가족 1인당 월 150,000원씩 과세표준에서 차감
 * (연간 1인당 150만원 기본공제 / 12개월 = 월 12.5만원이나, 간이세액표 근사치로 15만원 적용)
 */
function estimateIncomeTax(taxableIncome, dependents = 1) {
  // 부양가족 인적공제 적용 (본인은 이미 기본 포함이므로 추가분만 차감)
  const additionalDependents = Math.max(dependents - 1, 0);
  const deduction = additionalDependents * 150000;
  const adjustedIncome = Math.max(taxableIncome - deduction, 0);

  if (adjustedIncome <= 1060000) return 0;
  if (adjustedIncome <= 1500000) return Math.floor(adjustedIncome * 0.005 / 10) * 10;
  if (adjustedIncome <= 2500000) return Math.floor(adjustedIncome * 0.01 / 10) * 10;
  if (adjustedIncome <= 3000000) return Math.floor(adjustedIncome * 0.02 / 10) * 10;
  if (adjustedIncome <= 4000000) return Math.floor(adjustedIncome * 0.03 / 10) * 10;
  if (adjustedIncome <= 5000000) return Math.floor(adjustedIncome * 0.04 / 10) * 10;
  if (adjustedIncome <= 6000000) return Math.floor(adjustedIncome * 0.05 / 10) * 10;
  if (adjustedIncome <= 8000000) return Math.floor(adjustedIncome * 0.07 / 10) * 10;
  if (adjustedIncome <= 10000000) return Math.floor(adjustedIncome * 0.10 / 10) * 10;
  return Math.floor(adjustedIncome * 0.15 / 10) * 10;
}

/**
 * 당월 총 일수 계산
 */
function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 직원의 특정 월(YYYY-MM) 급여를 계산합니다.
 */
export function calculatePayroll({ employee, company, rates, paymentMonth }) {
  const [year, month] = paymentMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  
  const age = getAge(employee.birth_date, new Date(year, month - 1, getDaysInMonth(year, month)));
  let basePay = Number(employee.base_salary);
  let calculationMethod = "정상 지급 (기본급 전액)";

  // 수습 기간 처리 (90% 지급)
  if (employee.probation_end_date) {
    const probationEnd = new Date(employee.probation_end_date);
    const paymentDate = new Date(year, month - 1, daysInMonth);
    if (paymentDate <= probationEnd) {
      basePay = basePay * 0.9;
      calculationMethod = "수습 기간 적용 (기본급의 90%)";
    }
  }

  // 중도 입/퇴사자 일할 계산
  let effectiveDays = daysInMonth;
  const joinDate = new Date(employee.join_date);
  const resDate = employee.resignation_date ? new Date(employee.resignation_date) : null;
  const targetDateStr = `${year}-${String(month).padStart(2, '0')}`;
  
  if (employee.join_date.startsWith(targetDateStr)) {
    effectiveDays = daysInMonth - joinDate.getDate() + 1;
    basePay = (basePay / daysInMonth) * effectiveDays;
    calculationMethod = `일할 계산 (해당월: ${daysInMonth}일 중 ${effectiveDays}일 근무)`;
  } else if (resDate && employee.resignation_date.startsWith(targetDateStr)) {
    effectiveDays = resDate.getDate();
    basePay = (basePay / daysInMonth) * effectiveDays;
    calculationMethod = `퇴사자 일할 계산 (해당월: ${daysInMonth}일 중 ${effectiveDays}일 근무)`;
  }

  // 추가 수당 계산 (일할 계산 및 비과세 구분 적용)
  let taxableExtraSum = 0;
  let nonTaxableExtraSum = 0;
  let processedExtraPays = [];
  
  if (employee.extra_pays && Array.isArray(employee.extra_pays)) {
    employee.extra_pays.forEach(ep => {
      let epAmount = Number(ep.amount);
      if (effectiveDays < daysInMonth) {
        epAmount = (epAmount / daysInMonth) * effectiveDays;
      }
      const finalAmount = Math.floor(epAmount);
      
      if (ep.isTaxFree) {
        nonTaxableExtraSum += finalAmount;
      } else {
        taxableExtraSum += finalAmount;
      }
      
      processedExtraPays.push({ 
        name: ep.name, 
        amount: finalAmount, 
        isTaxFree: !!ep.isTaxFree 
      });
    });
  }

  // 보험료 및 세금 산정 기준 (기본급 + 과세 대상 수당)
  const taxableTotal = Math.floor(basePay + taxableExtraSum);
  // 총 지급액 (과세 + 비과세)
  const totalGrossPay = taxableTotal + nonTaxableExtraSum;


  // 4대 보험 계산 (동적 요율 적용)
  // 1. 국민연금 - 만 60세 이상 제외
  let nationalPension = 0;
  if (age < 60 || employee.continue_national_pension) {
    nationalPension = Math.floor(taxableTotal * (rates.nationalPension / 100) / 10) * 10;
  }

  // 2. 건강보험
  let healthInsurance = Math.floor(taxableTotal * (rates.healthInsurance / 100) / 10) * 10;

  // 3. 장기요양보험
  let longTermCare = Math.floor(healthInsurance * (rates.longTermCareRatio / 100) / 10) * 10;

  // 4. 고용보험 - 만 65세 이상 실업급여 면제 판단
  let employmentInsurance = 0;
  if (age < 65) {
     employmentInsurance = Math.floor(taxableTotal * (rates.employmentInsurance / 100) / 10) * 10;
  }

  // 5. 산재보험 (회사 전액 부담)
  let workersComp = Math.floor(taxableTotal * (rates.workersComp / 100) / 10) * 10;

  // 6. 소득세 및 지방소득세 (부양가족 인적공제 반영)
  const dependents = Number(employee.dependents) || 1;
  let incomeTax = estimateIncomeTax(taxableTotal, dependents);
  let residentTax = Math.floor((incomeTax * 0.1) / 10) * 10;

  const totalDeductions = nationalPension + healthInsurance + longTermCare + employmentInsurance + incomeTax + residentTax;
  const netPay = totalGrossPay - totalDeductions;

  return {
    basePay: Math.floor(basePay),
    extraPays: processedExtraPays,
    taxableTotal: Math.floor(taxableTotal),
    nonTaxableTotal: nonTaxableExtraSum,
    totalGrossPay: Math.floor(totalGrossPay),
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    workersComp, // 회사 부담분
    incomeTax,
    residentTax,
    totalDeductions,
    netPay: Math.floor(netPay),
    calculationMethod,
    ageContext: { age }
  };
}
