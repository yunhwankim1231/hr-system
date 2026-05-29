const fs = require('fs');
const path = require('path');

// Supabase 환경변수 로드
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
  process.exit(1);
}

// 백업 대상 전체 12개 테이블 정의
const tables = [
  'employees',
  'daily_workers',
  'daily_work_logs',
  'leave_management',
  'certificates',
  'system_settings',
  'tax_rate_table',
  'retirement_tax_calculations',
  'payslips',
  'year_end_tax_settlements',
  'payroll_archives',
  'audit_logs'
];

async function runBackup() {
  console.log("=== [자동 데이터베이스 백업 프로세스 시작] ===");
  
  const backupPayload = {
    backupVersion: '2.0',
    backupDate: new Date().toISOString(),
    companyName: '명진기업(주)',
    data: {}
  };

  try {
    for (const table of tables) {
      console.log(`-> 테이블 데이터 가져오는 중: ${table}...`);
      const url = `${supabaseUrl}/rest/v1/${table}?select=*`;
      
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`테이블 ${table} 조회 실패: ${res.status} - ${errText}`);
      }

      const rows = await res.json();
      backupPayload.data[table] = rows || [];
      console.log(`✓ [성공] ${table}: 총 ${rows.length}개 행 백업 완료.`);
    }

    // 백업 디렉토리 경로 지정 (프로젝트 루트의 backups/ 폴더)
    const backupsDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().substring(0, 10);
    const fileName = `MJ_HR_Backup_${dateStr}.json`;
    const filePath = path.join(backupsDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    console.log(`\n==================================================`);
    console.log(`★ 백업 파일 자동 생성 완료!`);
    console.log(`경로: ${filePath}`);
    console.log(`==================================================`);
  } catch (error) {
    console.error("\n❌ 백업 프로세스 중 치명적인 실패 발생:", error.message);
    process.exit(1);
  }
}

runBackup();
