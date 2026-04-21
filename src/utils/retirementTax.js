/**
 * 2024년 기준 퇴직소득세 계산 유틸리티
 */

/**
 * 근속연수 공제액 계산
 * @param {number} years 근속연수
 */
function getServiceYearDeduction(years) {
  if (years <= 5) return years * 1500000;
  if (years <= 10) return 7500000 + (years - 5) * 2000000;
  if (years <= 20) return 17500000 + (years - 10) * 2500000;
  return 42500000 + (years - 20) * 3000000;
}

/**
 * 퇴직소득 산출세액 계산 (기본 세율 적용)
 * @param {number} taxableBase 과세표준
 */
function calculateBasicTax(taxableBase) {
  if (taxableBase <= 14000000) return taxableBase * 0.06;
  if (taxableBase <= 50000000) return taxableBase * 0.15 - 1260000;
  if (taxableBase <= 88000000) return taxableBase * 0.24 - 5760000;
  if (taxableBase <= 150000000) return taxableBase * 0.35 - 15440000;
  if (taxableBase <= 300000000) return taxableBase * 0.38 - 19940000;
  if (taxableBase <= 500000000) return taxableBase * 0.40 - 25940000;
  if (taxableBase <= 1000000000) return taxableBase * 0.42 - 35940000;
  return taxableBase * 0.45 - 65940000;
}

/**
 * 퇴직소득세 총괄 계산
 * @param {number} severancePay 퇴직급여 (세전)
 * @param {string} joinDate 입사일
 * @param {string} resignationDate 퇴사일
 */
export function calculateRetirementTax(severancePay, joinDate, resignationDate) {
  const start = new Date(joinDate);
  const end = new Date(resignationDate);
  
  // 근속연수 계산 (1년 미만은 1년으로 산정)
  let years = end.getFullYear() - start.getFullYear();
  if (end.getMonth() < start.getMonth() || (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) {
    years--;
  }
  const serviceYears = Math.max(years, 1);

  // 1. 근속연수 공제
  const yearDeduction = getServiceYearDeduction(serviceYears);
  
  // 2. 환산급여 계산
  // (퇴직급여 - 근속연수공제) / 근속연수 * 12
  const incomeAfterYearDeduction = Math.max(severancePay - yearDeduction, 0);
  const convertedSalary = (incomeAfterYearDeduction / serviceYears) * 12;

  // 3. 환산급여 공제 (2023년 이후 개정분)
  let convertedSalaryDeduction = 0;
  if (convertedSalary <= 8000000) {
    convertedSalaryDeduction = convertedSalary * 1.0;
  } else if (convertedSalary <= 70000000) {
    convertedSalaryDeduction = 8000000 + (convertedSalary - 8000000) * 0.6;
  } else if (convertedSalary <= 120000000) {
    convertedSalaryDeduction = 45200000 + (convertedSalary - 70000000) * 0.45;
  } else if (convertedSalary <= 300000000) {
    convertedSalaryDeduction = 67700000 + (convertedSalary - 120000000) * 0.35;
  } else {
    convertedSalaryDeduction = 130700000 + (convertedSalary - 300000000) * 0.25;
  }

  // 4. 퇴직소득 과세표준
  const taxableBase = Math.max(convertedSalary - convertedSalaryDeduction, 0);

  // 5. 산출세액 (환산급여 기준)
  const calculatedTaxOnConverted = calculateBasicTax(taxableBase);

  // 6. 최종 퇴직소득세 (환산급여 산출세액 / 12 * 근속연수)
  const incomeTax = Math.floor((calculatedTaxOnConverted / 12) * serviceYears / 10) * 10;
  
  // 7. 지방소득세 (10%)
  const residentTax = Math.floor(incomeTax * 0.1 / 10) * 10;

  return {
    serviceYears,
    yearDeduction,
    convertedSalary,
    convertedSalaryDeduction,
    taxableBase,
    incomeTax,
    residentTax,
    totalTax: incomeTax + residentTax,
    netSeverancePay: severancePay - (incomeTax + residentTax)
  };
}
