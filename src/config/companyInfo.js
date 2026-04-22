/**
 * 단일 법인 전역 설정 파일
 * 원천징수부/영수증 상단의 '원천징수의무자' 정보로 사용됩니다.
 * 법인 정보 변경 시 이 파일만 수정하면 전체 시스템에 반영됩니다.
 */
const COMPANY_INFO = {
  // 1. 기본 정보
  name: '명진기업(주)', // ① 법인명(상호)

  /** 대표자명 */
  ceoName: '홍길동',

  /** 사업자등록번호 (000-00-00000) */
  businessNumber: '123-45-67890',

  /** 법인등록번호 (000000-0000000) */
  corporateNumber: '110111-0000000',

  /** 사업장 주소 */
  address: '서울특별시 영등포구 양평로 00길 00, 0층',

  /** 업태 */
  businessType: '제조업',

  /** 종목 */
  businessItem: '화학제품',

  /** 전화번호 */
  phone: '02-0000-0000',

  /** 직인 이미지 경로 (public 폴더 기준) */
  sealImagePath: '/seal.png',
};

export default COMPANY_INFO;
