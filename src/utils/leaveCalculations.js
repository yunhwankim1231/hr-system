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
