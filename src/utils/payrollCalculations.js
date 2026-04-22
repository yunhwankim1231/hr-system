import { getAge } from './getAge';

/**
 * 간이 근로소득세 산출기 (누진세 구간 테이블 기반)
 * 
 * 계산 방식: 해당 구간의 누적세액(fixed) + (과세소득 - 구간시작) × 세율
 * 예) 과세소득 7,000,000원, 구간 5M~7M (rate: 0.075, fixed: 106,700)
 *     → 106,700 + (7,000,000 - 5,000,000) × 0.075 = 256,700원
 */
export function estimateIncomeTax(taxableIncome, dependents = 1, rates) {
  // 기본 누진세 구간 (fixed = 해당 구간 시작점까지의 누적세액)
  const defaultSteps = [
    { over: 0,         upTo: 1060000,   rate: 0,     fixed: 0 },
    { over: 1060000,   upTo: 1500000,   rate: 0.005, fixed: 0 },
    { over: 1500000,   upTo: 2500000,   rate: 0.012, fixed: 2200 },
    { over: 2500000,   upTo: 3500000,   rate: 0.025, fixed: 14200 },
    { over: 3500000,   upTo: 5000000,   rate: 0.045, fixed: 39200 },
    { over: 5000000,   upTo: 7000000,   rate: 0.075, fixed: 106700 },
    { over: 7000000,   upTo: 10000000,  rate: 0.12,  fixed: 256700 },
    { over: 10000000,  upTo: 99999999,  rate: 0.18,  fixed: 616700 }
  ];

  const steps = (rates?.incomeTaxSteps && rates.incomeTaxSteps.length > 0) 
    ? rates.incomeTaxSteps 
    : defaultSteps;

  // 1. 부양가족 인적공제 (본인 제외 1인당 15만원)
  const additionalDependents = Math.max(dependents - 1, 0);
  const deduction = additionalDependents * 150000;
  const adjustedIncome = Math.max(taxableIncome - deduction, 0);

  if (adjustedIncome <= 1060000) return 0;

  // 2. 누진세 계산: fixed + (초과분 × rate)
  const step = steps.find(s => adjustedIncome > s.over && adjustedIncome <= s.upTo);
  let tax = 0;
  if (step) {
    const fixedTax = Number(step.fixed) || 0;
    tax = fixedTax + (adjustedIncome - step.over) * step.rate;
  } else {
    // 최고 구간 초과 시
    const lastStep = steps[steps.length - 1];
    const fixedTax = Number(lastStep?.fixed) || 0;
    tax = fixedTax + (adjustedIncome - (lastStep?.over || 0)) * (lastStep?.rate || 0.18);
  }

  // 3. 자녀 세액 공제 (임직원 정보의 children_count 기준)
  const childCount = Number(rates?.childCountOverride) || 0; 
  
  if (childCount >= 3) {
    tax = Math.max(tax - (rates?.childDeduction?.[3] || 0), 0);
  } else if (childCount === 2) {
    tax = Math.max(tax - (rates?.childDeduction?.[2] || 0), 0);
  } else if (childCount === 1) {
    tax = Math.max(tax - (rates?.childDeduction?.[1] || 0), 0);
  }

  return Math.floor(tax / 10) * 10;
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

  // 1. 국민연금 (근로자분 4.5%, 상한액 265,500원)
  let nationalPension = 0;
  if (age < 60 || employee.continue_national_pension) {
    // rates.nationalPension이 4.5라고 가정
    nationalPension = Math.floor(taxableTotal * (rates.nationalPension / 100) / 10) * 10;
    if (nationalPension > 265500) nationalPension = 265500;
  }

  // 2. 건강보험 (근로자분 3.545%)
  let healthInsurance = Math.floor(taxableTotal * (rates.healthInsurance / 100) / 10) * 10;
  if (healthInsurance > 3911280) healthInsurance = 3911280;

  // 3. 장기요양보험
  let longTermCare = Math.floor(healthInsurance * (rates.longTermCareRatio / 100) / 10) * 10;

  // 4. 고용보험 - 만 65세 이상 실업급여 면제 판단
  let employmentInsurance = 0;
  if (age < 65) {
     employmentInsurance = Math.floor(taxableTotal * (rates.employmentInsurance / 100) / 10) * 10;
  }

  // 5. 산재보험 (회사 전액 부담)
  let workersComp = Math.floor(taxableTotal * (rates.workersComp / 100) / 10) * 10;

  // 6. 소득세 및 지방소득세 (부양가족 및 자녀 수 반영)
  const dependents = Number(employee.dependents) || 1;
  const childCount = Number(employee.children_count) || 0;
  let incomeTax = estimateIncomeTax(taxableTotal, dependents, { ...rates, childCountOverride: childCount });
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

/**
 * 지급 내역이 변경되었을 때 4대보험 및 소득세를 재계산합니다.
 */
export function recalculateDeductions({ taxableTotal, employee, rates, paymentMonth }) {
  const [year, month] = (paymentMonth || '').split('-').map(Number);
  const targetDate = paymentMonth ? new Date(year, month, 0) : new Date();
  const age = getAge(employee.birth_date, targetDate); 
  
  // 1. 국민연금 (근로자분 4.5%, 상한액 265,500원)
  let nationalPension = 0;
  if (age < 60 || employee.continue_national_pension) {
    nationalPension = Math.floor(taxableTotal * (rates.nationalPension / 100) / 10) * 10;
    if (nationalPension > 265500) nationalPension = 265500;
  }

  // 2. 건강보험 (근로자분 3.545%)
  let healthInsurance = Math.floor(taxableTotal * (rates.healthInsurance / 100) / 10) * 10;
  if (healthInsurance > 3911280) healthInsurance = 3911280;

  // 3. 장기요양보험
  const longTermCare = Math.floor(healthInsurance * (rates.longTermCareRatio / 100) / 10) * 10;

  // 4. 고용보험
  let employmentInsurance = 0;
  if (age < 65) {
    employmentInsurance = Math.floor(taxableTotal * (rates.employmentInsurance / 100) / 10) * 10;
  }

  // 5. 소득세 (자녀 세액공제 포함)
  const dependents = Number(employee.dependents) || 1;
  const childCount = Number(employee.children_count) || 0;
  const incomeTax = estimateIncomeTax(taxableTotal, dependents, { ...rates, childCountOverride: childCount });
  const residentTax = Math.floor((incomeTax * 0.1) / 10) * 10;

  return {
    np: nationalPension,
    hi: healthInsurance,
    ltc: longTermCare,
    ei: employmentInsurance,
    it: incomeTax,
    rt: residentTax
  };
}
