-- 1. 법인 (Companies)
CREATE TABLE Companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    workers_comp_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0075 -- 산재보험 요율 (기본 0.75%)
);

-- 2. 임직원 (Employees)
CREATE TABLE Employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES Companies(id),
    name VARCHAR(255) NOT NULL,
    base_salary DECIMAL(10, 0) NOT NULL,
    birth_date DATE NOT NULL,
    employment_type VARCHAR(50) CHECK(employment_type IN ('정규직', '계약직', '아르바이트')),
    is_dual_employed BOOLEAN DEFAULT FALSE,
    join_date DATE NOT NULL,
    probation_end_date DATE,
    resignation_date DATE,
    continue_national_pension BOOLEAN DEFAULT FALSE, -- 만 60세 이상 계속 납부 옵션
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 연차 관리 (LeaveManagement)
CREATE TABLE LeaveManagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES Employees(id),
    leave_date DATE NOT NULL,
    leave_days DECIMAL(2, 1) DEFAULT 1.0, -- 반차(0.5) 등 가능
    status VARCHAR(50) CHECK(status IN ('신청', '승인', '반려')) DEFAULT '신청',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 급여 대장/명세서 (Payslips)
CREATE TABLE Payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES Employees(id),
    payment_month VARCHAR(7) NOT NULL, -- YYYY-MM
    base_pay DECIMAL(10, 0),
    overtime_hours DECIMAL(5, 1) DEFAULT 0,
    night_hours DECIMAL(5, 1) DEFAULT 0,
    holiday_hours DECIMAL(5, 1) DEFAULT 0,
    overtime_pay DECIMAL(10, 0) DEFAULT 0,
    national_pension DECIMAL(10, 0),
    health_insurance DECIMAL(10, 0),
    long_term_care DECIMAL(10, 0),
    employment_insurance DECIMAL(10, 0),
    workers_comp DECIMAL(10, 0), -- 회사 부담분
    calculation_method TEXT, -- 계산식/예외적용 명시 (증빙용)
    confirmed_at TIMESTAMP WITH TIME ZONE, -- 명세서 확인(서명) 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정 예시: 관리자만 접근 가능 등 추가 필요
-- ALTER TABLE Employees ENABLE ROW LEVEL SECURITY;
