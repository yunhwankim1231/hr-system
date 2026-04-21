export const mockCompanies = [
  { id: 'C1', name: 'A법인 (IT 개발)', workers_comp_rate: 0.0075 },
  { id: 'C2', name: 'B법인 (서비스업)', workers_comp_rate: 0.0085 },
  { id: 'C3', name: 'C법인 (제조업)', workers_comp_rate: 0.0150 }
];

export const mockEmployees = [
  {
    id: 'E1',
    company_id: 'C1',
    name: '김개발',
    base_salary: 4000000,
    birth_date: '1990-05-15',
    employment_type: '정규직',
    is_dual_employed: false,
    join_date: '2023-01-01',
    resignation_date: null,
    probation_end_date: '2023-04-01',
    continue_national_pension: false
  },
  {
    id: 'E2',
    company_id: 'C1',
    name: '이수습',
    base_salary: 3000000,
    birth_date: '1995-11-20',
    employment_type: '정규직',
    is_dual_employed: false,
    join_date: '2024-03-01', // 이번달 수습 종료 가정
    resignation_date: null,
    probation_end_date: '2024-05-31', 
    continue_national_pension: false
  },
  {
    id: 'E3',
    company_id: 'C2',
    name: '박시니어',
    base_salary: 3500000,
    birth_date: '1962-04-10', // 60세 이상 (국민연금 확인용)
    employment_type: '정규직',
    is_dual_employed: false,
    join_date: '2020-03-15',
    resignation_date: null,
    probation_end_date: null,
    continue_national_pension: false
  },
  {
    id: 'E4',
    company_id: 'C3',
    name: '최고문',
    base_salary: 5000000,
    birth_date: '1958-02-01', // 65세 이상 (고용보험 확인용)
    employment_type: '계약직',
    is_dual_employed: false,
    join_date: '2015-06-01',
    resignation_date: null,
    probation_end_date: null,
    continue_national_pension: true // 계속 납부 옵션 On
  }
];

export const mockLeaveRecords = [];
