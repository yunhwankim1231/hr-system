/**
 * [전문 기업용] 퇴직소득세 계산 엔진 (2024년 세법 기준)
 * 국세청 홈택스 표준 산식 및 구조화된 Audit Trail 지원
 */

/**
 * 전역 라운딩 유틸리티
 */
export function applyRounding(value, policy) {
  if (!value || isNaN(value)) return 0;
  switch (policy) {
    case 'FLOOR_1':
      return Math.floor(value);
    case 'FLOOR_10':
      return Math.floor(value / 10) * 10;
    case 'FLOOR_100':
      return Math.floor(value / 100) * 100;
    default:
      return Math.floor(value / 10) * 10;
  }
}

/**
 * 근속연수별 퇴직소득공제액 (STEP 2)
 */
function getServiceYearDeduction(years) {
  if (years <= 5) return years * 1500000;
  if (years <= 10) return 7500000 + (years - 5) * 2000000;
  if (years <= 20) return 17500000 + (years - 10) * 2500000;
  return 42500000 + (years - 20) * 3000000;
}

/**
 * 환산급여공제액
 */
function getConvertedSalaryDeduction(convertedSalary) {
  if (convertedSalary <= 8000000) return convertedSalary;
  if (convertedSalary <= 70000000) return 8000000 + (convertedSalary - 8000000) * 0.6;
  if (convertedSalary <= 120000000) return 45200000 + (convertedSalary - 70000000) * 0.45;
  if (convertedSalary <= 300000000) return 67700000 + (convertedSalary - 120000000) * 0.35;
  return 130700000 + (convertedSalary - 300000000) * 0.25;
}

/**
 * 세율 및 누진공제 적용 (STEP 4)
 */
function getTaxRateInfo(taxableBase, taxRates) {
  const rates = taxRates.length > 0 ? taxRates : [
    { min_amount: 0, max_amount: 14000000, tax_rate: 0.06, deduction_amount: 0 },
    { min_amount: 14000000, max_amount: 50000000, tax_rate: 0.15, deduction_amount: 1260000 },
    { min_amount: 50000000, max_amount: 88000000, tax_rate: 0.24, deduction_amount: 5760000 },
    { min_amount: 88000000, max_amount: 150000000, tax_rate: 0.35, deduction_amount: 15440000 },
    { min_amount: 150000000, max_amount: 300000000, tax_rate: 0.38, deduction_amount: 19940000 },
    { min_amount: 300000000, max_amount: 500000000, tax_rate: 0.40, deduction_amount: 25940000 },
    { min_amount: 500000000, max_amount: 1000000000, tax_rate: 0.42, deduction_amount: 35940000 },
    { min_amount: 1000000000, max_amount: null, tax_rate: 0.45, deduction_amount: 65940000 }
  ];

  const step = rates.find(r => taxableBase > r.min_amount && (r.max_amount === null || taxableBase <= r.max_amount));
  return step || rates[0];
}

/**
 * 메인 계산 함수
 */
export function calculateProfessionalRetirementTax(params) {
  const {
    totalRetirementPay,
    joinDate,
    resignationDate,
    taxRates = [],
    roundingPolicy = 'FLOOR_10',
    serviceYearsMode = 'MONTH'
  } = params;

  const audit = [];
  const round = (val) => applyRounding(val, roundingPolicy);

  // [STEP 1] 근속연수 계산
  const start = new Date(joinDate);
  const end = new Date(resignationDate);
  let serviceYears = 1;
  
  if (serviceYearsMode === 'DAY') {
    const totalDays = Math.ceil((end - start) / (86400000)) + 1;
    serviceYears = Math.max(Math.ceil(totalDays / 365), 1);
    audit.push(`[STEP 1] 근속연수 판정 (DAY 모드)\n- 기간: ${joinDate} ~ ${resignationDate}\n- 총 일수: ${totalDays.toLocaleString()}일\n- 결과: ${serviceYears}년 (1년 미만 올림)`);
  } else {
    const diffYears = end.getFullYear() - start.getFullYear();
    const diffMonths = end.getMonth() - start.getMonth();
    const diffDays = end.getDate() - start.getDate();
    let totalMonths = diffYears * 12 + diffMonths;
    if (diffDays < 0) totalMonths--;
    serviceYears = Math.max(Math.ceil(totalMonths / 12), 1);
    audit.push(`[STEP 1] 근속연수 판정 (MONTH 모드)\n- 기간: ${joinDate} ~ ${resignationDate}\n- 총 월수: ${Math.max(totalMonths, 0)}개월\n- 결과: ${serviceYears}년 (1년 미만 올림)`);
  }

  // [STEP 2] 퇴직소득공제
  const incomeAmount = round(totalRetirementPay);
  const serviceYearDeduction = round(getServiceYearDeduction(serviceYears));
  const incomeAfterDeduction = Math.max(incomeAmount - serviceYearDeduction, 0);
  audit.push(`[STEP 2] 퇴직소득공제 산출\n- 퇴직소득금액(Input): ${incomeAmount.toLocaleString()}원\n- 근속연수공제(Output): ${serviceYearDeduction.toLocaleString()}원\n- 공제 후 금액: ${incomeAfterDeduction.toLocaleString()}원`);

  // [STEP 3] 환산급여 계산
  const rawConvertedSalary = (incomeAfterDeduction / serviceYears) * 12;
  const convertedSalary = round(rawConvertedSalary);
  const convertedSalaryDeduction = round(getConvertedSalaryDeduction(convertedSalary));
  const taxableBase = round(Math.max(convertedSalary - convertedSalaryDeduction, 0));
  audit.push(`[STEP 3] 환산급여 및 과세표준\n- 환산급여(Input): ${convertedSalary.toLocaleString()}원\n- 환산급여공제(Output): ${convertedSalaryDeduction.toLocaleString()}원\n- 과세표준(환산): ${taxableBase.toLocaleString()}원`);

  // [STEP 4] 세율 적용
  const rateStep = getTaxRateInfo(taxableBase, taxRates);
  const rawTaxConverted = taxableBase * rateStep.tax_rate - rateStep.deduction_amount;
  const calculatedTaxConverted = round(rawTaxConverted);
  audit.push(`[STEP 4] 세율 적용 (DB/표준 조회)\n- 적용 구간: ${rateStep.min_amount.toLocaleString()}원 초과\n- 적용 세율: ${(rateStep.tax_rate * 100).toFixed(1)}%\n- 누진공제: ${rateStep.deduction_amount.toLocaleString()}원\n- 산출세액(환산): ${calculatedTaxConverted.toLocaleString()}원`);

  // [STEP 5] 환산세액 복원 (세액공제 단계 포함)
  // *현재 세법상 퇴직소득 세액공제는 별도 계산이 없으나 구조적 확장을 위해 배치
  const incomeTax = round((calculatedTaxConverted / 12) * serviceYears);
  audit.push(`[STEP 5] 환산세액 복원\n- 산식: (환산산출세액 / 12) * 근속연수\n- 계산: (${calculatedTaxConverted.toLocaleString()} / 12) * ${serviceYears}\n- 결과(소득세): ${incomeTax.toLocaleString()}원`);

  // [STEP 6] 최종세액 확정
  const residentTax = round(incomeTax * 0.1);
  const totalTax = incomeTax + residentTax;
  audit.push(`[STEP 6] 최종 세액 확정\n- 퇴직소득세: ${incomeTax.toLocaleString()}원\n- 지방소득세(10%): ${residentTax.toLocaleString()}원\n- 총 납부세액: ${totalTax.toLocaleString()}원`);

  return {
    serviceYears,
    serviceYearDeduction,
    convertedSalary,
    convertedSalaryDeduction,
    taxableBase,
    incomeTax,
    residentTax,
    totalTax,
    netPay: incomeAmount - totalTax,
    auditTrail: audit
  };
}
