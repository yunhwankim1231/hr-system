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
ALTER TABLE employees ADD COLUMN IF NOT EXISTS income_tax_rate INTEGER DEFAULT 100; -- 80, 100, 120% 선택
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_sme_exemption BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sme_exemption_rate INTEGER DEFAULT 90;

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

-- 10. 데이터 이력 관리 (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  table_name TEXT NOT NULL,         -- 예: 'employees'
  record_id TEXT NOT NULL,          -- 변경된 레코드의 ID
  action TEXT NOT NULL,             -- 'UPDATE', 'INSERT', 'DELETE'
  old_data JSONB,                   -- 변경 전 데이터
  new_data JSONB,                   -- 변경 후 데이터
  changed_by UUID,                  -- 수정한 사람 (auth.users id)
  changed_by_email TEXT,            -- 수정한 사람의 이메일
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 기존 테이블이 있다면 컬럼 추가 (에러 방지용)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_by_email TEXT;

-- 직원 테이블(employees) 변경 추적을 위한 함수
CREATE OR REPLACE FUNCTION log_employee_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_email TEXT;
BEGIN
  -- 현재 로그인한 사용자의 JWT에서 이메일을 추출
  current_email := auth.jwt() ->> 'email';

  IF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by, changed_by_email)
      VALUES ('employees', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), current_email);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by, changed_by_email)
    VALUES ('employees', NEW.id, 'INSERT', NULL, to_jsonb(NEW), auth.uid(), current_email);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by, changed_by_email)
    VALUES ('employees', OLD.id, 'DELETE', to_jsonb(OLD), NULL, auth.uid(), current_email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 직원 테이블 트리거 (만약 존재하면 제거 후 재성성)
DROP TRIGGER IF EXISTS employee_audit_trigger ON employees;
CREATE TRIGGER employee_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION log_employee_changes();

-- 5. 급여 명세서 (payslips)
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    payment_month VARCHAR(7) NOT NULL, -- YYYY-MM
    
    -- 과세 항목
    base_salary BIGINT DEFAULT 0,
    extra_pays JSONB DEFAULT '[]'::jsonb,
    total_taxable BIGINT DEFAULT 0,
    
    -- 비과세 항목
    total_non_taxable BIGINT DEFAULT 0,
    
    -- 공제 항목
    national_pension BIGINT DEFAULT 0,
    health_insurance BIGINT DEFAULT 0,
    long_term_care BIGINT DEFAULT 0,
    employment_insurance BIGINT DEFAULT 0,
    income_tax BIGINT DEFAULT 0,
    resident_tax BIGINT DEFAULT 0,
    
    -- 연말정산 관련 추가 항목
    year_end_tax_income BIGINT DEFAULT 0,    -- 연말정산 소득세 (환급 - / 추가 +)
    year_end_tax_resident BIGINT DEFAULT 0,  -- 연말정산 지방소득세
    
    total_deductions BIGINT DEFAULT 0,
    net_pay BIGINT DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'Draft', -- Draft, Finalized
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(employee_id, payment_month)
);

-- 6. 연말정산 관리 (year_end_tax_settlements)
CREATE TABLE IF NOT EXISTS year_end_tax_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
    target_year INTEGER NOT NULL, -- 귀속 연도 (예: 2025)
    
    -- 진행 상태 (대기, 진행중, 완료)
    status VARCHAR(20) DEFAULT '대기' CHECK(status IN ('대기', '진행중', '완료')),
    
    -- [1] 급여 및 기납부세액 (Payslips 테이블에서 연동하여 집계)
    total_pay BIGINT DEFAULT 0,         -- 총급여액 (비과세 제외)
    pre_paid_tax BIGINT DEFAULT 0,      -- 기납부세액 합계 (소득세+지방소득세)
    
    -- [2] 공제 항목 상세 (세부 항목이 너무 많으므로 JSONB로 구조화하여 저장)
    dependents_json JSONB DEFAULT '[]'::jsonb,           -- 부양가족 인적공제 상세 배열
    income_deductions_json JSONB DEFAULT '{}'::jsonb,    -- 소득공제 (건강/고용보험, 주택자금, 신용카드 등)
    tax_exemptions_json JSONB DEFAULT '{}'::jsonb,       -- 세액공제/감면 (의료비, 교육비, 기부금, 중소기업감면 등)
    
    -- [3] 최종 세액 계산 결과
    calculated_tax BIGINT DEFAULT 0,    -- 산출세액
    final_tax BIGINT DEFAULT 0,         -- 결정세액
    refund_or_pay BIGINT DEFAULT 0,     -- 차감징수세액 (-면 환급, +면 징수)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 한 직원은 특정 귀속 연도에 단 하나의 연말정산 기록만 가짐
    UNIQUE(employee_id, target_year)
);

-- =========================================================================
-- [보안 및 데이터 안정성 강화 개선안]
-- =========================================================================

-- 1. 급여 아카이브 전용 개별 테이블 생성
CREATE TABLE IF NOT EXISTS payroll_archives (
    id TEXT PRIMARY KEY, -- 'YYYY-MM' 형식의 기본 키
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    data JSONB NOT NULL,
    finalized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 전체 테이블 RLS 활성화 및 로그인한 사용자(authenticated) 전용 정책 부여
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON employees;
CREATE POLICY "authenticated_only" ON employees FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE daily_workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON daily_workers;
CREATE POLICY "authenticated_only" ON daily_workers FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE daily_work_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON daily_work_logs;
CREATE POLICY "authenticated_only" ON daily_work_logs FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE leave_management ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON leave_management;
CREATE POLICY "authenticated_only" ON leave_management FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON certificates;
CREATE POLICY "authenticated_only" ON certificates FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON system_settings;
CREATE POLICY "authenticated_only" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE tax_rate_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON tax_rate_table;
CREATE POLICY "authenticated_only" ON tax_rate_table FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE retirement_tax_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON retirement_tax_calculations;
CREATE POLICY "authenticated_only" ON retirement_tax_calculations FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON audit_logs;
CREATE POLICY "authenticated_only" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON payslips;
CREATE POLICY "authenticated_only" ON payslips FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE year_end_tax_settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON year_end_tax_settlements;
CREATE POLICY "authenticated_only" ON year_end_tax_settlements FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE payroll_archives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_only" ON payroll_archives;
CREATE POLICY "authenticated_only" ON payroll_archives FOR ALL USING (auth.role() = 'authenticated');


