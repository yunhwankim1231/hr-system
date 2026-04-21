/**
 * 기준일 대비 만 나이를 계산합니다.
 * @param {string|Date} birthDate 생년월일
 * @param {string|Date} baseDate 기준일 (기본값: 오늘)
 * @returns {number} 만 나이
 */
export function getAge(birthDate, baseDate = new Date()) {
  const birth = new Date(birthDate);
  const base = new Date(baseDate);

  let age = base.getFullYear() - birth.getFullYear();
  const m = base.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && base.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
