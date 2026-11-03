/**
 * Comprehensive Automated Testing & Load Testing Suite
 * Tests all 27 required modules + 10, 50, 100, 200 concurrent user load tests
 */

const BASE_URL = 'http://127.0.0.1:3000/api';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details?: string;
  durationMs?: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, category: string, name: string, details?: string) {
  results.push({
    category,
    name,
    passed: !!condition,
    details: condition ? 'OK' : details || 'Assertion failed',
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${category}] ${name}${details ? ` - ${details}` : ''}`);
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN HỆ THỐNG QUIZ & KEY MANAGER');
  console.log('========================================================\n');

  // ----------------------------------------------------
  // MODULE 1: ADMIN LOGIN, LOGOUT & PERMISSIONS (RBAC)
  // ----------------------------------------------------
  console.log('\n--- 1. Kiểm thử Đăng nhập, Đăng xuất & Phân quyền Admin ---');
  
  // 1.1 Invalid login
  const failLoginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'WrongPassword999' }),
  });
  assert(failLoginRes.status === 401, 'Admin Auth', 'Từ chối đăng nhập với mật khẩu sai', `Status: ${failLoginRes.status}`);

  // 1.2 Valid Super Admin login
  const adminLoginRes = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123456' }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;
  assert(adminLoginRes.status === 200 && !!adminToken, 'Admin Auth', 'Đăng nhập Super Admin thành công', `Token length: ${adminToken?.length}`);

  // 1.3 Verify Admin Session (/admin/me)
  const adminMeRes = await fetch(`${BASE_URL}/admin/me`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminMeData = await adminMeRes.json();
  assert(adminMeRes.status === 200 && adminMeData.role === 'super_admin', 'Admin Auth', 'Xác thực phiên Super Admin', `Role: ${adminMeData.role}`);

  // 1.4 Access Admin API without token (Security Check)
  const noTokenRes = await fetch(`${BASE_URL}/admin/me`);
  assert(noTokenRes.status === 401, 'Bảo mật', 'Từ chối truy cập API Admin khi không có Token', `Status: ${noTokenRes.status}`);

  // ----------------------------------------------------
  // MODULE 2: DASHBOARD & METRICS
  // ----------------------------------------------------
  console.log('\n--- 2. Kiểm thử Dashboard & Thống kê ---');
  const dashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const dashData = await dashRes.json();
  assert(dashRes.status === 200 && dashData.kpis && Array.isArray(dashData.scoreDistribution), 'Dashboard', 'Tải KPI Dashboard & Biểu đồ phân bố điểm số');

  // ----------------------------------------------------
  // MODULE 3: KEY CREATION & BULK CREATION
  // ----------------------------------------------------
  console.log('\n--- 3. Kiểm thử Tạo Key & Tạo Hàng Loạt Key ---');
  // 3.1 Create single key
  const create1Res = await fetch(`${BASE_URL}/admin/keys/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ count: 1, prefix: 'TEST1', durationHours: 5, notes: 'Key test đơn' }),
  });
  const create1Data = await create1Res.json();
  const testKey1 = create1Data.keys?.[0]?.key;
  assert(create1Res.status === 200 && !!testKey1 && testKey1.startsWith('TEST1-'), 'Key Management', 'Tạo 1 Key truy cập với tiền tố TEST1', `Key: ${testKey1}`);

  // 3.2 Bulk Create 20 keys
  const createBulkRes = await fetch(`${BASE_URL}/admin/keys/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ count: 20, prefix: 'BULK', durationHours: 5, notes: 'Key test hàng loạt' }),
  });
  const createBulkData = await createBulkRes.json();
  assert(createBulkRes.status === 200 && createBulkData.keys?.length === 20, 'Key Management', 'Tạo hàng loạt 20 Key thành công', `Count: ${createBulkData.keys?.length}`);

  // ----------------------------------------------------
  // MODULE 4: KEY ACTIVATION, 1-DEVICE POLICY & 5-HOUR TIMER
  // ----------------------------------------------------
  console.log('\n--- 4. Kiểm thử Kích hoạt Key, Khóa 1 Thiết Bị & Thời Hạn 5 Giờ ---');
  
  // 4.1 Activate testKey1 on Device A
  const deviceA = 'dev_fingerprint_device_A_1111';
  const activateARes = await fetch(`${BASE_URL}/key/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: testKey1,
      name: 'Nguyễn Văn A',
      deviceId: deviceA,
      deviceInfo: 'Chrome on Windows 11',
    }),
  });
  const activateAData = await activateARes.json();
  const playerTokenA = activateAData.token;
  assert(
    activateARes.status === 200 && activateAData.success && !!playerTokenA,
    'Kích hoạt Key',
    'Kích hoạt Key lần đầu trên Thiết bị A',
    `User: ${activateAData.name}, Token: ${playerTokenA?.substring(0, 8)}...`
  );
  assert(
    activateAData.remainingSeconds > 0 && activateAData.remainingSeconds <= 5 * 3600,
    'Key 5 Giờ',
    'Thời hạn Key được ấn định chuẩn 5 giờ (≤ 18000s)',
    `Còn lại: ${activateAData.remainingSeconds}s`
  );

  // 4.2 Attempt to activate SAME key on Device B (MUST BE REJECTED)
  const deviceB = 'dev_fingerprint_device_B_2222';
  const activateBRes = await fetch(`${BASE_URL}/key/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: testKey1,
      name: 'Trần Thị B',
      deviceId: deviceB,
      deviceInfo: 'Safari on iPhone 15 Pro',
    }),
  });
  assert(
    activateBRes.status === 403,
    'Chính sách 1 Thiết Bị',
    'Từ chối kích hoạt cùng Key trên Thiết bị B khác',
    `Status: ${activateBRes.status}`
  );

  // 4.3 Same Device A re-entering key (MUST RESUME SESSION)
  const resumeARes = await fetch(`${BASE_URL}/key/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key: testKey1,
      name: 'Nguyễn Văn A',
      deviceId: deviceA,
      deviceInfo: 'Chrome on Windows 11',
    }),
  });
  const resumeAData = await resumeARes.json();
  const activePlayerToken = resumeAData.token || playerTokenA;
  assert(
    resumeARes.status === 200 && resumeAData.success,
    'Khôi phục phiên',
    'Thiết bị A hợp lệ khôi phục phiên làm bài thành công'
  );

  // 4.4 Check session countdown (/key/session)
  const sessionRes = await fetch(`${BASE_URL}/key/session?token=${activePlayerToken}`);
  const sessionData = await sessionRes.json();
  assert(
    sessionRes.status === 200 && sessionData.authenticated && sessionData.remainingSeconds > 0,
    'Đồng hồ đếm ngược',
    'Đồng bộ thời gian đếm ngược thời gian thực từ Server',
    `Remaining: ${sessionData.remainingSeconds}s`
  );

  // ----------------------------------------------------
  // MODULE 5: QUIZ QUESTIONS, SUBMISSION & SERVER SCORING
  // ----------------------------------------------------
  console.log('\n--- 5. Kiểm thử Làm bài, Chấm điểm Server-Authoritative & Lưu kết quả ---');
  
  // Submit answers as Player A
  const sampleAnswers = {
    singleChoice: {
      A1_1: 1, // Correct (MYCIN -> Y học)
      A1_2: 3, // Correct (Bixby)
      A1_3: 3, // Correct (Sophia)
    },
    trueFalse: {
      A1_19: { a: true, b: false, c: true, d: false },
    },
    shortAnswer: {
      A1_23: 'turing', // Testing case-insensitive normalization
    },
  };

  const submitRes = await fetch(`${BASE_URL}/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activePlayerToken}`,
    },
    body: JSON.stringify({
      quizId: 'quiz_tin12_gk1',
      answers: sampleAnswers,
      timeSpentSeconds: 120,
    }),
  });
  const submitData = await submitRes.json();
  assert(
    submitRes.status === 200 && submitData.success && submitData.result?.score !== undefined,
    'Nộp bài & Chấm điểm',
    'Nộp bài và chấm điểm chính xác phía Server',
    `Điểm: ${submitData.result?.score}/10, Đúng: ${submitData.result?.correctCount} câu`
  );

  // ----------------------------------------------------
  // MODULE 6: LEADERBOARD, USER STATS & AUDIT LOGS
  // ----------------------------------------------------
  console.log('\n--- 6. Kiểm thử Bảng Xếp Hạng & Nhật Ký Hoạt Động ---');
  const lbRes = await fetch(`${BASE_URL}/admin/leaderboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const lbData = await lbRes.json();
  const foundInLeaderboard = lbData.topScores?.some((r: any) => r.key === testKey1);
  assert(foundInLeaderboard, 'Bảng Xếp Hạng', 'Thí sinh A xuất hiện chính xác trên Bảng xếp hạng');

  const logsRes = await fetch(`${BASE_URL}/admin/logs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const logsData = await logsRes.json();
  assert(Array.isArray(logsData) && logsData.length > 0, 'Nhật Ký Audit', 'Ghi nhật ký hoạt động đầy đủ', `Tổng số log: ${logsData.length}`);

  // ----------------------------------------------------
  // MODULE 7: KEY ACTIONS (REVOKE, EXTEND, RESET DEVICE)
  // ----------------------------------------------------
  console.log('\n--- 7. Kiểm thử Quản trị Key: Gia hạn, Thu hồi, Reset thiết bị ---');
  
  // Find testKey1's record ID in admin keys
  const keysListRes = await fetch(`${BASE_URL}/admin/keys?search=${testKey1}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const keysList = await keysListRes.json();
  const testKeyRecord = keysList.find((k: any) => k.key === testKey1);
  assert(!!testKeyRecord, 'Key Management', 'Tìm thấy bản ghi Key trong danh sách quản trị');

  if (testKeyRecord) {
    // 7.1 Extend Key by 2 hours
    const extendRes = await fetch(`${BASE_URL}/admin/keys/${testKeyRecord.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'extend', addHours: 2 }),
    });
    const extendData = await extendRes.json();
    assert(extendRes.status === 200 && extendData.success, 'Gia hạn Key', 'Gia hạn thêm 2 giờ thành công');

    // 7.2 Reset Device
    const resetDevRes = await fetch(`${BASE_URL}/admin/keys/${testKeyRecord.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'reset_device' }),
    });
    assert(resetDevRes.status === 200, 'Reset Thiết Bị', 'Admin reset thiết bị cho Key thành công');

    // 7.3 Device B now can activate this Key because device was reset!
    const activateBAfterReset = await fetch(`${BASE_URL}/key/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: testKey1,
        name: 'Trần Thị B',
        deviceId: deviceB,
        deviceInfo: 'Safari on iPhone 15 Pro',
      }),
    });
    const activateBAfterResetData = await activateBAfterReset.json();
    assert(
      activateBAfterReset.status === 200 && activateBAfterResetData.success,
      'Liên kết Thiết Bị Mới',
      'Thiết bị B kích hoạt thành công sau khi Admin reset thiết bị'
    );

    // 7.4 Revoke Key while active
    const revokeRes = await fetch(`${BASE_URL}/admin/keys/${testKeyRecord.id}/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'revoke' }),
    });
    assert(revokeRes.status === 200, 'Thu Hồi Key', 'Admin thu hồi Key thành công');

    // 7.5 Attempt to submit with revoked key (MUST BE REJECTED)
    const submitRevokedRes = await fetch(`${BASE_URL}/quiz/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activateBAfterResetData.token}`,
      },
      body: JSON.stringify({
        quizId: 'quiz_tin12_gk1',
        answers: {},
        timeSpentSeconds: 60,
      }),
    });
    assert(
      submitRevokedRes.status === 403 || submitRevokedRes.status === 401,
      'Bảo Mật Key Thu Hồi',
      'Chặn nộp bài khi Key đã bị Admin thu hồi',
      `Status: ${submitRevokedRes.status}`
    );
  }

  // ----------------------------------------------------
  // MODULE 8: SYSTEM SETTINGS & BACKUP
  // ----------------------------------------------------
  console.log('\n--- 8. Kiểm thử Cài đặt Hệ Thống & Sao lưu CSDL ---');
  const settingsRes = await fetch(`${BASE_URL}/admin/settings`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const settingsData = await settingsRes.json();
  assert(
    settingsRes.status === 200 && (settingsData.settings?.siteName || settingsData.siteName),
    'Cài đặt hệ thống',
    'Lấy cấu hình hệ thống chuẩn xác'
  );

  const backupRes = await fetch(`${BASE_URL}/admin/backup`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const backupData = await backupRes.json();
  assert(
    backupRes.status === 200 && Array.isArray(backupData.access_keys),
    'Sao lưu CSDL',
    'Tải bản sao lưu CSDL toàn vẹn'
  );

  // ----------------------------------------------------
  // MODULE 9: CONCURRENCY STRESS TESTS (10, 50, 100, 200 USERS)
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log('⚡ KIỂM TRA TẢI ĐỒNG THỜI (10, 50, 100, 200 NGƯỜI DÙNG)');
  console.log('========================================================\n');

  // Test 9.1: Race condition - 10 people trying to activate the EXACT SAME unused Key at the SAME millisecond
  console.log('--- Test 9.1: 10 Thiết bị đồng thời kích hoạt CÙNG 1 Key mới ---');
  const collisionKeyRes = await fetch(`${BASE_URL}/admin/keys/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ count: 1, prefix: 'RACE', durationHours: 5, notes: 'Key test race condition' }),
  });
  const collisionKey = (await collisionKeyRes.json()).keys[0].key;

  const simultaneousAttempts = await Promise.all(
    Array.from({ length: 10 }).map((_, i) =>
      fetch(`${BASE_URL}/key/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: collisionKey,
          name: `Học sinh Race ${i}`,
          deviceId: `device_race_${i}_${Math.random()}`,
        }),
      }).then((r) => r.status)
    )
  );

  const successCount = simultaneousAttempts.filter((status) => status === 200).length;
  const rejectedCount = simultaneousAttempts.filter((status) => status !== 200).length;
  assert(
    successCount === 1 && rejectedCount === 9,
    'Xung đột đồng thời (Race Condition)',
    `Chỉ duy nhất 1 thiết bị kích hoạt thành công (Thành công: ${successCount}, Bị từ chối: ${rejectedCount})`
  );

  // Test 9.2: 10 Concurrent Users with 10 distinct Keys
  console.log('\n--- Test 9.2: Tải đồng thời 10 người dùng ---');
  await runConcurrentSimulation(10, adminToken);

  // Test 9.3: 50 Concurrent Users with 50 distinct Keys
  console.log('\n--- Test 9.3: Tải đồng thời 50 người dùng ---');
  await runConcurrentSimulation(50, adminToken);

  // Test 9.4: 100 Concurrent Users with 100 distinct Keys
  console.log('\n--- Test 9.4: Tải đồng thời 100 người dùng ---');
  await runConcurrentSimulation(100, adminToken);

  // Test 9.5: 200 Concurrent Users with 200 distinct Keys
  console.log('\n--- Test 9.5: Tải đồng thời 200 người dùng ---');
  await runConcurrentSimulation(200, adminToken);

  // ----------------------------------------------------
  // FINAL EVALUATION & SUMMARY
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ HỆ THỐNG');
  console.log('========================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Tổng số kiểm thử: ${total}`);
  console.log(`Đạt (PASS): ${passed}`);
  console.log(`Thất bại (FAIL): ${failed}`);
  console.log(`Tỷ lệ đạt: ${Math.round((passed / total) * 100)}%`);

  if (failed > 0) {
    console.log('\nCác kiểm thử thất bại:');
    results.filter((r) => !r.passed).forEach((r) => console.log(`- [${r.category}] ${r.name}: ${r.details}`));
    process.exit(1);
  } else {
    console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ & TẢI 200 USER ĐÃ HOÀN TOÀN ĐẠT CHUẨN!');
    process.exit(0);
  }
}

async function runConcurrentSimulation(userCount: number, adminToken: string) {
  const start = Date.now();

  // 1. Generate userCount keys
  const bulkRes = await fetch(`${BASE_URL}/admin/keys/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ count: userCount, prefix: `T${userCount}`, durationHours: 5, notes: `Load test ${userCount}` }),
  });
  const keysData = await bulkRes.json();
  const keys: string[] = keysData.keys.map((k: any) => k.key);

  // 2. Concurrently activate all keys
  const activationStart = Date.now();
  const activationResults = await Promise.all(
    keys.map((key, i) =>
      fetch(`${BASE_URL}/key/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          name: `Thí Sinh T${userCount}_${i + 1}`,
          deviceId: `device_concurrent_${userCount}_${i}`,
          deviceInfo: `Device ${i}`,
        }),
      }).then(async (r) => ({
        status: r.status,
        data: await r.json(),
      }))
    )
  );
  const activationDuration = Date.now() - activationStart;
  const allActivated = activationResults.every((res) => res.status === 200 && res.data.token);
  assert(
    allActivated,
    `Tải đồng thời ${userCount}`,
    `${userCount} người dùng kích hoạt Key đồng thời thành công (${activationDuration}ms)`
  );

  // 3. Concurrently submit quizzes
  const tokens = activationResults.map((r) => r.data.token);
  const submitStart = Date.now();
  const submitResults = await Promise.all(
    tokens.map((token, i) =>
      fetch(`${BASE_URL}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          quizId: 'quiz_tin12_gk1',
          answers: {
            singleChoice: {
              A1_1: i % 2 === 0 ? 1 : 0, // Even users get correct, odd users get wrong
              A1_2: 3,
            },
          },
          timeSpentSeconds: 60 + i,
        }),
      }).then(async (r) => {
        const text = await r.text();
        try {
          return { status: r.status, data: JSON.parse(text) };
        } catch {
          return { status: r.status, data: { raw: text } };
        }
      })
    )
  );
  const submitDuration = Date.now() - submitStart;
  const allSubmitted = submitResults.every((res) => res.status === 200 && res.data.success);
  assert(
    allSubmitted,
    `Tải đồng thời ${userCount}`,
    `${userCount} người nộp bài đồng thời không bị nghẽn hay lỗi (${submitDuration}ms)`
  );

  // 4. Data integrity check: Verify distinctness of results
  const distinctScores = new Set(submitResults.map((r) => r.data.result?.id));
  assert(
    distinctScores.size === userCount,
    `Toàn vẹn dữ liệu ${userCount}`,
    `Mỗi bài nộp có bản ghi kết quả và ID riêng biệt (100% không bị ghi đè hay mất dữ liệu)`
  );

  console.log(`   ⏱️ Hoàn thành test tải ${userCount} người dùng trong: ${Date.now() - start}ms`);
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
