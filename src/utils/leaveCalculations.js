/**
 * 입사일 기준으로 현재 시점까지 발생한 총 법정 연차 개수를 계산합니다.
 */
export function calculateAnnualLeave(joinDateStr, baseDate = new Date()) {
  const joinDate = new Date(joinDateStr);
  const diffTime = Math.abs(baseDate - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30.416); // 대략적인 개월 수
  const diffYears = baseDate.getFullYear() - joinDate.getFullYear() - 
    (baseDate.getMonth() < joinDate.getMonth() || (baseDate.getMonth() === joinDate.getMonth() && baseDate.getDate() < joinDate.getDate()) ? 1 : 0);

  let totalLeave = 0;

  if (diffYears < 1) {
    // 1년 미만: 1개월 개근 시 1일 발생 (최대 11일)
    totalLeave = Math.min(diffMonths, 11);
  } else {
    // 1년 이상: 기본 15일 + 2년마다 1일 가산 (최대 25일)
    // 1년차(15), 3년차(16), 5년차(17)...
    const extraLeave = Math.floor((diffYears - 1) / 2);
    totalLeave = Math.min(15 + extraLeave, 25);
  }

  return totalLeave;
}

/**
 * 입사일 기준으로 상세 계산 내역을 포함한 연차 정보를 반환합니다.
 */
export function getLeaveDetails(joinDateStr, baseDate = new Date(), workHours = 8) {
  const joinDate = new Date(joinDateStr);
  const ratio = (workHours || 8) / 8;
  
  if (baseDate < joinDate) {
    return { totalLeave: 0, details: '입사 전입니다.', diffYears: 0 };
  }

  const diffTime = Math.abs(baseDate - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30.416);
  const diffYears = baseDate.getFullYear() - joinDate.getFullYear() - 
    (baseDate.getMonth() < joinDate.getMonth() || (baseDate.getMonth() === joinDate.getMonth() && baseDate.getDate() < joinDate.getDate()) ? 1 : 0);

  let baseLeave = 0;
  let details = '';

  if (diffYears < 1) {
    baseLeave = Math.min(diffMonths, 11);
    details = `1년 미만 (${diffMonths}개월 근속): 매월 1일 발생`;
  } else {
    const extraLeave = Math.min(Math.floor((diffYears - 1) / 2), 10);
    baseLeave = 15 + extraLeave;
    details = `기본 15일 + 가산 ${extraLeave}일 (${diffYears}년 근속)`;
  }

  const totalLeave = Number((baseLeave * ratio).toFixed(2));
  if (ratio !== 1) {
    details += ` × 시간비례(${workHours}h/8h) = ${totalLeave}일`;
  } else {
    details += ` = ${totalLeave}일`;
  }

  return { totalLeave, details, diffYears };
}
