-- 인사관리 시스템 최종 통합 스크립트 (Supabase용)

-- 0. 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 임직원 (employees)
-- 기존 테이블이 있다면 컬럼만 추가하고, 없다면 생성합니다.
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    join_date DATE NOT NULL,
    resignation_date DATE,
    status TEXT DEFAULT '재직',
    workplace TEXT,
    role TEXT,
    position TEXT,
    dependents INTEGER DEFAULT 1,
    children_count INTEGER DEFAULT 0,
    base_salary BIGINT DEFAULT 0,
    phone TEXT,
    birth_date DATE,
    resident_number TEXT,
    address TEXT,
    employment_type TEXT DEFAULT '정규직',
    is_dual_employed BOOLEAN DEFAULT false,
    probation_end_date DATE,
    continue_national_pension BOOLEAN DEFAULT false,
    bank_name TEXT,
    account_number TEXT,
    has_irp_account BOOLEAN DEFAULT false,
    irp_provider TEXT,
    irp_account_number TEXT,
    addons TEXT DEFAULT '[]', -- 추가 수당 JSONB 데이터
    work_hours INTEGER DEFAULT 8,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 누락된 컬럼 안전하게 추가
ALTER TABLE employees ADD COLUMN IF NOT EXISTS resident_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS has_irp_account BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS irp_provider TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS irp_account_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS children_count INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_hours INTEGER DEFAULT 8;

-- 2. 일용직 인력풀 (daily_workers)
CREATE TABLE IF NOT EXISTS daily_workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    daily_rate BIGINT DEFAULT 0,
    bank TEXT,
    account TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 일용직 근무 기록 (daily_work_logs)
CREATE TABLE IF NOT EXISTS daily_work_logs (
    id TEXT PRIMARY KEY,
    worker_id TEXT REFERENCES daily_workers(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours NUMERIC DEFAULT 8,
    wage BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 연차 및 근태 기록 (leave_management)
CREATE TABLE IF NOT EXISTS leave_management (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    leave_date DATE NOT NULL,
    leave_days NUMERIC DEFAULT 1.0,
    status TEXT DEFAULT '승인',
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, leave_date)
);

-- 5. 증명서 발급 이력 (certificates)
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emp_name TEXT NOT NULL,
    cert_no TEXT UNIQUE,
    type TEXT,
    purpose TEXT,
    issue_date DATE,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 시스템 공통 설정 (system_settings)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 퇴직소득 세율 정보 (tax_rate_table)
CREATE TABLE IF NOT EXISTS tax_rate_table (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_amount BIGINT NOT NULL,
    max_amount BIGINT,
    tax_rate NUMERIC NOT NULL,
    deduction_amount BIGINT DEFAULT 0,
    effective_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 퇴직금 정산 결과 기록 (retirement_tax_calculations)
CREATE TABLE IF NOT EXISTS retirement_tax_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id TEXT REFERENCES employees(id),
    calculation_date DATE DEFAULT CURRENT_DATE,
    calculation_hash TEXT UNIQUE,
    service_years INTEGER,
    taxable_amount BIGINT,
    excess_labor_income BIGINT,
    input_json JSONB,
    result_json JSONB,
    audit_json JSONB,
    tax_version INTEGER DEFAULT 2024,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 2024년 기준 퇴직소득세 기본 세율 데이터
INSERT INTO tax_rate_table (min_amount, max_amount, tax_rate, deduction_amount, effective_year)
VALUES 
(0, 14000000, 0.06, 0, 2024),
(14000000, 50000000, 0.15, 1260000, 2024),
(50000000, 88000000, 0.24, 5760000, 2024),
(88000000, 150000000, 0.35, 15440000, 2024),
(150000000, 300000000, 0.38, 19940000, 2024),
(300000000, 500000000, 0.40, 25940000, 2024),
(500000000, 1000000000, 0.42, 35940000, 2024),
(1000000000, NULL, 0.45, 65940000, 2024)
ON CONFLICT DO NOTHING;
