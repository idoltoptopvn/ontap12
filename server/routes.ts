import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  getDb,
  saveDb,
  saveDbImmediate,
  logActivity,
  hashPassword,
  generateAccessKey,
  AccessKey,
  QuizUser,
  ActivityLog,
  AdminUser,
} from './db';
import { calculateScore } from '../src/utils/quizHelper';
import { RAW_QUESTIONS } from '../src/data/quizQuestions';

export const router = express.Router();

// Memory store for anti brute-force rate-limiting
interface AttemptRecord {
  count: number;
  lastAttempt: number;
  blockedUntil: number;
}
const rateLimits = new Map<string, AttemptRecord>();
const adminRateLimits = new Map<string, AttemptRecord>();

// Concurrency mutex lock per Key
const keyActivationLocks = new Set<string>();

// Memory store for transferring key sessions between Facebook In-App Browser and Safari/Chrome
interface TransferTokenRecord {
  token: string;
  key: string;
  sourceDeviceId: string;
  createdAt: number;
  expiresAt: number;
}
const transferTokens = new Map<string, TransferTokenRecord>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateLimits.get(ip);
  if (!rec) return true;
  if (rec.blockedUntil > now) return false;
  // If block expired, reset
  if (rec.blockedUntil > 0 && rec.blockedUntil <= now) {
    rateLimits.delete(ip);
    return true;
  }
  return true;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const rec = rateLimits.get(ip) || { count: 0, lastAttempt: now, blockedUntil: 0 };
  rec.count++;
  rec.lastAttempt = now;
  if (rec.count >= 5) {
    rec.blockedUntil = now + 5 * 1000; // 5 seconds block
  }
  rateLimits.set(ip, rec);
}

function resetFailedAttempt(ip: string) {
  rateLimits.delete(ip);
}

function checkAdminRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = adminRateLimits.get(ip);
  if (!rec) return true;
  if (rec.blockedUntil > now) return false;
  if (rec.blockedUntil > 0 && rec.blockedUntil <= now) {
    adminRateLimits.delete(ip);
    return true;
  }
  return true;
}

function recordFailedAdminAttempt(ip: string) {
  const now = Date.now();
  const rec = adminRateLimits.get(ip) || { count: 0, lastAttempt: now, blockedUntil: 0 };
  rec.count++;
  rec.lastAttempt = now;
  if (rec.count >= 5) {
    rec.blockedUntil = now + 5 * 1000; // 5 seconds block
  }
  adminRateLimits.set(ip, rec);
}

function resetFailedAdminAttempt(ip: string) {
  adminRateLimits.delete(ip);
}

// In-memory active admin sessions
const adminSessions = new Map<string, { adminId: string; role: string; username: string; expiresAt: number }>();

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware: Admin Auth
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);
  if (!token) {
    return res.status(401).json({ error: 'Chưa đăng nhập quyền quản trị' });
  }

  const session = adminSessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    adminSessions.delete(token);
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ' });
  }

  (req as any).admin = session;
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAdmin(req, res, () => {
    const admin = (req as any).admin;
    if (admin.role !== 'super_admin') {
      return res.status(403).json({ error: 'Chỉ Super Admin mới có quyền thực hiện thao tác này' });
    }
    next();
  });
}

// ==========================================
// 1. PUBLIC & PLAYER ACCESS KEY APIS
// ==========================================

// Check and activate Key
router.post('/key/activate', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!checkRateLimit(ip)) {
    const rec = rateLimits.get(ip);
    const waitSec = Math.max(1, Math.ceil(((rec?.blockedUntil || 0) - Date.now()) / 1000));
    return res.status(429).json({
      error: `Quá nhiều lần thử không hợp lệ. Vui lòng thử lại sau ${waitSec} giây.`,
    });
  }

  const { key, name, deviceId, deviceInfo } = req.body;

  if (!key || !deviceId) {
    return res.status(400).json({ error: 'Thiếu mã Key hoặc định danh thiết bị' });
  }

  const cleanKey = key.trim().toUpperCase();

  // Concurrency lock to prevent race condition when two requests activate the same key simultaneously
  if (keyActivationLocks.has(cleanKey)) {
    return res.status(409).json({ error: 'Mã Key đang được xử lý đồng thời. Vui lòng thử lại sau giây lát.' });
  }
  keyActivationLocks.add(cleanKey);

  try {
    const db = getDb();

    // Check system lock
    if (db.system_settings.systemLocked) {
      return res.status(503).json({ error: 'Hệ thống đang tạm khóa để bảo trì. Vui lòng quay lại sau.' });
    }

    if (!db.system_settings.allowKeyActivation) {
      return res.status(403).json({ error: 'Tính năng kích hoạt Key tạm thời bị vô hiệu hóa.' });
    }

    const foundKey = db.access_keys.find((k) => k.key === cleanKey);

    if (!foundKey) {
      recordFailedAttempt(ip);
      logActivity('Guest', 'Nhập sai Key', `Thử nhập key: ${cleanKey} từ thiết bị: ${deviceId}`, ip, 'warning');
      return res.status(404).json({ error: 'Mã Key không tồn tại trên hệ thống' });
    }

    const now = Date.now();

    // Check status
    if (foundKey.status === 'revoked') {
      return res.status(403).json({ error: 'Key này đã bị Quản trị viên thu hồi.' });
    }
    if (foundKey.status === 'locked') {
      return res.status(403).json({ error: 'Key này đang bị khóa tạm thời. Vui lòng liên hệ Admin.' });
    }

    // Case 1: Key is active -> Check device and expiry
    if (foundKey.status === 'active') {
      if (foundKey.expiresAt && new Date(foundKey.expiresAt).getTime() <= now) {
        foundKey.status = 'expired';
        saveDb();
        return res.status(403).json({ error: 'Key đã hết hạn sử dụng (quá 5 giờ).' });
      }

      // If device was reset by Admin (boundDeviceId is null), bind to this new device!
      if (!foundKey.boundDeviceId) {
        foundKey.boundDeviceId = deviceId;
        foundKey.boundDeviceInfo = deviceInfo || 'Thiết bị Web';
        if (name && name.trim()) {
          foundKey.boundUserName = name.trim();
        }
      } else if (foundKey.boundDeviceId !== deviceId) {
        // Enforce strict 1-device policy
        logActivity(
          foundKey.boundUserName || 'User',
          'Vi phạm liên kết thiết bị',
          `Key ${cleanKey} đã kích hoạt trên [${foundKey.boundDeviceId}], cố truy cập từ [${deviceId}]`,
          ip,
          'warning'
        );
        return res.status(403).json({
          error:
            'Key này đã được liên kết với một thiết bị khác. Mỗi Key chỉ sử dụng trên 1 thiết bị duy nhất. Vui lòng liên hệ Admin để reset thiết bị.',
        });
      }

      // Same device resuming session!
      resetFailedAttempt(ip);
      const expiresAt = foundKey.expiresAt!;
      const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));

      // Reuse active session if already present for this device and unexpired
      let existingSession = db.device_sessions.find(
        (s) => s.key === cleanKey && s.deviceId === deviceId && new Date(s.expiresAt).getTime() > now
      );
      let token = existingSession?.token;
      if (!token) {
        token = generateToken();
        db.device_sessions = db.device_sessions.filter((s) => s.key !== cleanKey);
        db.device_sessions.push({
          token,
          userId: foundKey.boundUserId || 'user_anon',
          key: cleanKey,
          deviceId,
          ip,
          createdAt: new Date().toISOString(),
          expiresAt,
        });
      }

      saveDb();

      return res.json({
        success: true,
        message: 'Khôi phục phiên làm bài thành công',
        token,
        key: cleanKey,
        name: foundKey.boundUserName,
        expiresAt,
        remainingSeconds,
        durationHours: foundKey.durationHours,
      });
    }

    // Case 2: Key is unused -> Activate it!
    if (foundKey.status === 'unused') {
      resetFailedAttempt(ip);

      const userName = (name && name.trim()) || 'Học sinh';
      const durationHours = foundKey.durationHours || db.system_settings.defaultKeyDurationHours || 5;
      const expiresAt = new Date(now + durationHours * 3600 * 1000).toISOString();
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      foundKey.status = 'active';
      foundKey.activatedAt = new Date().toISOString();
      foundKey.expiresAt = expiresAt;
      foundKey.boundDeviceId = deviceId;
      foundKey.boundDeviceInfo = deviceInfo || 'Trình duyệt Web';
      foundKey.boundUserId = userId;
      foundKey.boundUserName = userName;

      // Create user record
      const newUser: QuizUser = {
        id: userId,
        name: userName,
        key: cleanKey,
        deviceId,
        deviceInfo: deviceInfo || 'Thiết bị Web',
        activatedAt: foundKey.activatedAt,
        expiresAt,
        status: 'active',
        highestScore: 0,
        totalAttempts: 0,
        lastActiveAt: new Date().toISOString(),
      };
      db.users.push(newUser);

      // Create session token
      const token = generateToken();
      db.device_sessions.push({
        token,
        userId,
        key: cleanKey,
        deviceId,
        ip,
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      logActivity(
        userName,
        'Kích hoạt Key mới',
        `Kích hoạt Key ${cleanKey} thành công (Thời hạn: ${durationHours} giờ) trên thiết bị [${deviceId.substring(0, 8)}...]`,
        ip,
        'success'
      );

      // Save immediately to disk so concurrent requests never see stale data
      saveDbImmediate();

      return res.json({
        success: true,
        message: 'Kích hoạt Key thành công!',
        token,
        key: cleanKey,
        name: userName,
        expiresAt,
        remainingSeconds: durationHours * 3600,
        durationHours,
      });
    }

    return res.status(400).json({ error: 'Trạng thái Key không hợp lệ' });
  } finally {
    keyActivationLocks.delete(cleanKey);
  }
});

// System Access Mode: Public check
router.get('/system/access-mode', (_req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    success: true,
    freeAccessMode: !!db.system_settings.freeAccessMode,
    updatedAt: db.system_settings.freeAccessUpdatedAt || null,
    updatedBy: db.system_settings.freeAccessUpdatedBy || null,
    siteName: db.system_settings.siteName,
  });
});

// Guest session initialization when Free Access Mode is active
router.post('/quiz/guest-session', (req: Request, res: Response) => {
  const db = getDb();
  const isFree = !!db.system_settings.freeAccessMode;

  if (!isFree) {
    return res.status(403).json({
      error: 'Hệ thống hiện đang yêu cầu Key bản quyền 5 giờ. Vui lòng nhập Key để bắt đầu.',
      requireKey: true,
      freeAccessMode: false,
    });
  }

  const { name, deviceId } = req.body;
  const guestName = (name && name.trim()) || 'Học sinh';
  const token = 'guest_free_' + generateToken();
  const userId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  db.device_sessions.push({
    token,
    userId,
    key: 'MIỄN PHÍ',
    deviceId: deviceId || 'guest_device',
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  saveDb();

  return res.json({
    success: true,
    freeAccessMode: true,
    token,
    key: 'MIỄN PHÍ',
    userName: guestName,
    remainingSeconds: 86400,
    expiresAt,
  });
});

// Verify active player session & remaining time (supports both Key and Free mode)
router.get('/key/session', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || (req.query.token as string);
  const db = getDb();
  const isFree = !!db.system_settings.freeAccessMode;

  // Case 1: No token provided
  if (!token) {
    if (isFree) {
      return res.json({
        authenticated: true,
        freeAccessMode: true,
        key: 'MIỄN PHÍ',
        userName: 'Học sinh',
        remainingSeconds: 86400,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        systemSettings: {
          siteName: db.system_settings.siteName,
          showExplanation: db.system_settings.showExplanation,
          showAnswers: db.system_settings.showAnswers,
          freeAccessMode: true,
        },
      });
    }
    return res.status(401).json({ authenticated: false, freeAccessMode: false, error: 'Thiếu mã phiên' });
  }

  // Case 2: Guest token (issued during free access mode)
  if (token.startsWith('guest_free_')) {
    if (!isFree) {
      return res.status(403).json({
        authenticated: false,
        freeAccessMode: false,
        requireKey: true,
        error: 'Chế độ miễn phí đã kết thúc. Vui lòng nhập Key bản quyền 5 giờ để tiếp tục làm bài.',
      });
    }
    const session = db.device_sessions.find((s) => s.token === token);
    return res.json({
      authenticated: true,
      freeAccessMode: true,
      key: 'MIỄN PHÍ',
      userName: 'Học sinh',
      remainingSeconds: 86400,
      expiresAt: session?.expiresAt || new Date(Date.now() + 86400000).toISOString(),
      systemSettings: {
        siteName: db.system_settings.siteName,
        showExplanation: db.system_settings.showExplanation,
        showAnswers: db.system_settings.showAnswers,
        freeAccessMode: true,
      },
    });
  }

  // Case 3: Key-based session
  const session = db.device_sessions.find((s) => s.token === token);

  if (!session) {
    if (isFree) {
      return res.json({
        authenticated: true,
        freeAccessMode: true,
        key: 'MIỄN PHÍ',
        userName: 'Học sinh',
        remainingSeconds: 86400,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        systemSettings: {
          siteName: db.system_settings.siteName,
          showExplanation: db.system_settings.showExplanation,
          showAnswers: db.system_settings.showAnswers,
          freeAccessMode: true,
        },
      });
    }
    return res.status(401).json({ authenticated: false, freeAccessMode: false, error: 'Phiên không hợp lệ' });
  }

  const now = Date.now();
  const expiresTime = new Date(session.expiresAt).getTime();

  if (now >= expiresTime) {
    if (isFree) {
      return res.json({
        authenticated: true,
        freeAccessMode: true,
        key: session.key || 'MIỄN PHÍ',
        userName: 'Học sinh',
        remainingSeconds: 86400,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
    }
    // Key has expired in standard mode!
    const keyRecord = db.access_keys.find((k) => k.key === session.key);
    if (keyRecord && keyRecord.status === 'active') {
      keyRecord.status = 'expired';
      logActivity(keyRecord.boundUserName || 'User', 'Key hết hạn', `Key ${keyRecord.key} đã hết hạn 5 giờ`, session.ip, 'warning');
      saveDb();
    }
    return res.status(403).json({ authenticated: false, expired: true, freeAccessMode: false, error: 'Key đã hết hạn sử dụng (5 giờ)!' });
  }

  const remainingSeconds = Math.max(0, Math.floor((expiresTime - now) / 1000));
  const keyRecord = db.access_keys.find((k) => k.key === session.key);

  if (!keyRecord || keyRecord.status !== 'active') {
    if (isFree) {
      return res.json({
        authenticated: true,
        freeAccessMode: true,
        key: 'MIỄN PHÍ',
        userName: 'Học sinh',
        remainingSeconds: 86400,
      });
    }
    return res.status(403).json({ authenticated: false, freeAccessMode: false, error: 'Key đã bị khóa hoặc thu hồi' });
  }

  return res.json({
    authenticated: true,
    freeAccessMode: isFree,
    key: session.key,
    userName: keyRecord.boundUserName,
    remainingSeconds,
    expiresAt: session.expiresAt,
    systemSettings: {
      siteName: db.system_settings.siteName,
      showExplanation: db.system_settings.showExplanation,
      showAnswers: db.system_settings.showAnswers,
      freeAccessMode: isFree,
    },
  });
});

// Create transfer token when switching from Facebook In-App Browser to external browser
router.post('/key/create-transfer-token', (req: Request, res: Response) => {
  const { key, deviceId } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Thiếu mã Key để tạo token chuyển đổi' });
  }

  const cleanKey = key.trim().toUpperCase();
  const db = getDb();
  const foundKey = db.access_keys.find((k) => k.key === cleanKey);

  if (!foundKey) {
    return res.status(404).json({ error: 'Mã Key không tồn tại' });
  }

  if (foundKey.status !== 'active') {
    return res.status(400).json({ error: 'Key chưa kích hoạt hoặc đã hết hạn/thu hồi' });
  }

  // Check device match if bound
  if (foundKey.boundDeviceId && deviceId && foundKey.boundDeviceId !== deviceId) {
    return res.status(403).json({ error: 'Thiết bị không khớp với thiết bị đã kích hoạt Key' });
  }

  const transferToken = 'tr_' + crypto.randomBytes(16).toString('hex');
  const now = Date.now();
  transferTokens.set(transferToken, {
    token: transferToken,
    key: cleanKey,
    sourceDeviceId: deviceId || foundKey.boundDeviceId || 'unknown',
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes valid
  });

  logActivity(
    foundKey.boundUserName || 'User',
    'Tạo mã chuyển trình duyệt',
    `Tạo mã chuyển từ Facebook sang Safari/Chrome cho Key ${cleanKey}`,
    req.ip || '127.0.0.1',
    'success'
  );

  return res.json({
    success: true,
    transferToken,
    expiresInSeconds: 600,
  });
});

// Claim transfer token in external browser (Safari/Chrome)
router.post('/key/claim-transfer-token', (req: Request, res: Response) => {
  const { key, transferToken, newDeviceId, newDeviceInfo } = req.body;

  if (!key || !transferToken || !newDeviceId) {
    return res.status(400).json({ error: 'Thiếu thông tin chuyển đổi trình duyệt' });
  }

  const cleanKey = key.trim().toUpperCase();
  const record = transferTokens.get(transferToken);

  if (!record) {
    return res.status(400).json({ error: 'Mã chuyển đổi không hợp lệ hoặc đã được sử dụng' });
  }

  if (record.key !== cleanKey) {
    return res.status(400).json({ error: 'Mã chuyển đổi không khớp với mã Key này' });
  }

  if (record.expiresAt < Date.now()) {
    transferTokens.delete(transferToken);
    return res.status(400).json({ error: 'Mã chuyển đổi đã hết hạn (quá 10 phút)' });
  }

  // Single-use token: remove immediately
  transferTokens.delete(transferToken);

  const db = getDb();
  const foundKey = db.access_keys.find((k) => k.key === cleanKey);

  if (!foundKey || foundKey.status !== 'active') {
    return res.status(400).json({ error: 'Key không tồn tại hoặc không còn hiệu lực' });
  }

  const now = Date.now();
  if (foundKey.expiresAt && new Date(foundKey.expiresAt).getTime() <= now) {
    foundKey.status = 'expired';
    saveDb();
    return res.status(403).json({ error: 'Key đã hết hạn sử dụng (5 giờ).' });
  }

  // Seamlessly update bound device to the new external browser
  foundKey.boundDeviceId = newDeviceId;
  if (newDeviceInfo) {
    foundKey.boundDeviceInfo = newDeviceInfo;
  }

  // Update QuizUser record
  const user = db.users.find((u) => u.key === cleanKey || u.id === foundKey.boundUserId);
  if (user) {
    user.deviceId = newDeviceId;
    if (newDeviceInfo) user.deviceInfo = newDeviceInfo;
    user.lastActiveAt = new Date().toISOString();
  }

  // Re-issue fresh device session token for this new browser
  const token = generateToken();
  const expiresAt = foundKey.expiresAt!;
  db.device_sessions = db.device_sessions.filter((s) => s.key !== cleanKey);
  db.device_sessions.push({
    token,
    userId: foundKey.boundUserId || 'user_anon',
    key: cleanKey,
    deviceId: newDeviceId,
    ip: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  saveDbImmediate();

  logActivity(
    foundKey.boundUserName || 'User',
    'Chuyển trình duyệt thành công',
    `Đồng bộ Key ${cleanKey} từ Facebook sang trình duyệt ngoài [${newDeviceInfo || newDeviceId}]`,
    req.ip || '127.0.0.1',
    'success'
  );

  const remainingSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));

  return res.json({
    success: true,
    message: 'Chuyển sang trình duyệt ngoài thành công!',
    token,
    key: cleanKey,
    name: foundKey.boundUserName,
    expiresAt,
    remainingSeconds,
    durationHours: foundKey.durationHours,
  });
});

// Submit Quiz and calculate server-side verified score
router.post('/quiz/submit', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.body.token;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const db = getDb();
    const isFree = !!db.system_settings.freeAccessMode;

    let userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let userName = (req.body.studentName && req.body.studentName.trim()) || 'Học sinh';
    let keyUsed = isFree ? 'MIỄN PHÍ' : '';

    if (isFree) {
      // In Free Access Mode: Accept with or without token, or with guest token or regular token
      if (token) {
        const session = db.device_sessions.find((s) => s.token === token);
        if (session) {
          userId = session.userId;
          if (session.key && session.key !== 'MIỄN PHÍ') {
            keyUsed = session.key;
            const kRec = db.access_keys.find((k) => k.key === session.key);
            if (kRec?.boundUserName) {
              userName = kRec.boundUserName;
            }
          }
        }
      }
    } else {
      // Free mode is OFF: Strictly enforce valid Key!
      if (!token || token.startsWith('guest_free_')) {
        return res.status(401).json({
          error: 'Chế độ miễn phí đã kết thúc. Vui lòng nhập Key hợp lệ (5 giờ) để nộp bài.',
          requireKey: true,
          freeAccessMode: false,
        });
      }

      const session = db.device_sessions.find((s) => s.token === token);
      if (!session) {
        return res.status(401).json({ error: 'Chưa xác thực hoặc phiên đã hết hạn', requireKey: true });
      }

      const now = Date.now();
      if (now >= new Date(session.expiresAt).getTime()) {
        return res.status(403).json({ error: 'Thời gian Key đã hết hạn. Không thể nộp bài.', requireKey: true });
      }

      const keyRecord = db.access_keys.find((k) => k.key === session.key);
      if (!keyRecord || keyRecord.status !== 'active') {
        return res.status(403).json({ error: 'Key đã bị thu hồi hoặc tạm khóa. Không thể nộp bài.', requireKey: true });
      }

      userId = session.userId;
      userName = keyRecord.boundUserName || userName;
      keyUsed = session.key;
    }

    const { quizId, answers, timeSpentSeconds } = req.body;
    const quiz = db.quizzes.find((q) => q.id === (quizId || 'quiz_tin12_gk1')) || db.quizzes[0];
    const questions = (db.questions && db.questions.length > 0) ? db.questions : RAW_QUESTIONS;
    const safeAnswers = answers || { singleChoice: {}, trueFalse: {}, shortAnswer: {} };

    // Server-authoritative score calculation!
    const calculated = calculateScore(questions, safeAnswers, timeSpentSeconds || 0, 'exam');

    const resultRecord: any = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      userName,
      key: keyUsed,
      quizId: quiz.id,
      quizTitle: quiz.title,
      score: calculated.score,
      correctCount: calculated.correctCount,
      wrongCount: calculated.wrongCount,
      unansweredCount: calculated.unansweredCount,
      totalQuestions: questions.length,
      timeSpentSeconds: timeSpentSeconds || 0,
      completedAt: new Date().toISOString(),
      userAnswers: safeAnswers,
      isFreeAccess: isFree && keyUsed === 'MIỄN PHÍ',
    };

    db.quiz_results.unshift(resultRecord);

    // Update user stats
    const user = db.users.find((u) => u.id === userId || (keyUsed && u.key === keyUsed));
    if (user) {
      user.totalAttempts = (user.totalAttempts || 0) + 1;
      if (calculated.score > (user.highestScore || 0)) {
        user.highestScore = calculated.score;
      }
      user.lastActiveAt = new Date().toISOString();
    }

    logActivity(
      resultRecord.userName,
      isFree && keyUsed === 'MIỄN PHÍ' ? 'Nộp bài Quiz (Miễn phí)' : 'Nộp bài Quiz (Key)',
      `Đã nộp bài "${quiz.title}", Điểm: ${calculated.score}/10 (${calculated.correctCount}/${questions.length} đúng) [${keyUsed}]`,
      ip,
      'success'
    );

    saveDb();

    return res.json({
      success: true,
      result: resultRecord,
    });
  } catch (err: any) {
    console.error('Quiz submit error:', err);
    return res.status(500).json({ error: 'Lỗi nộp bài thi: ' + (err?.message || 'Không xác định') });
  }
});

// ==========================================
// 2. ADMIN AUTHENTICATION APIS
// ==========================================

router.post('/admin/login', (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  if (!checkAdminRateLimit(ip)) {
    const rec = adminRateLimits.get(ip);
    const waitSec = Math.max(1, Math.ceil(((rec?.blockedUntil || 0) - Date.now()) / 1000));
    return res.status(429).json({
      error: `Quá nhiều lần đăng nhập Admin sai. Vui lòng thử lại sau ${waitSec} giây.`,
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu' });
  }

  const db = getDb();
  const hash = hashPassword(password);
  const admin = db.admins.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());

  if (!admin || admin.passwordHash !== hash) {
    recordFailedAdminAttempt(ip);
    logActivity('Guest', 'Admin đăng nhập thất bại', `Thử đăng nhập tài khoản: "${username}"`, ip, 'warning');
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  }

  resetFailedAdminAttempt(ip);

  // Generate Admin Token (valid 24h)
  const token = generateToken();
  const expiresAt = Date.now() + 24 * 3600 * 1000;

  adminSessions.set(token, {
    adminId: admin.id,
    role: admin.role,
    username: admin.username,
    expiresAt,
  });

  admin.lastLoginAt = new Date().toISOString();
  logActivity(admin.username, 'Admin đăng nhập', `Đăng nhập quyền [${admin.role}] thành công`, ip, 'success');
  saveDb();

  return res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
    },
  });
});

router.get('/admin/me', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const db = getDb();
  const admin = db.admins.find((a) => a.id === session.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Quản trị viên không tồn tại' });
  }
  return res.json({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
  });
});

router.post('/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);
  const session = (req as any).admin;
  if (token) adminSessions.delete(token);
  logActivity(session.username, 'Admin đăng xuất', 'Đăng xuất phiên làm việc', req.ip || '127.0.0.1', 'success');
  return res.json({ success: true, message: 'Đăng xuất thành công' });
});

// ==========================================
// 3. ADMIN DASHBOARD & STATS APIS
// ==========================================

router.get('/admin/dashboard', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const now = Date.now();

  // Auto-expire active keys that passed expiresAt
  let modified = false;
  db.access_keys.forEach((k) => {
    if (k.status === 'active' && k.expiresAt && new Date(k.expiresAt).getTime() <= now) {
      k.status = 'expired';
      modified = true;
    }
  });
  if (modified) saveDb();

  const totalKeys = db.access_keys.length;
  const unusedKeys = db.access_keys.filter((k) => k.status === 'unused').length;
  const activeKeys = db.access_keys.filter((k) => k.status === 'active').length;
  const expiredKeys = db.access_keys.filter((k) => k.status === 'expired').length;
  const revokedKeys = db.access_keys.filter((k) => k.status === 'revoked' || k.status === 'locked').length;

  const totalUsers = db.users.length;
  const activeUsers = db.users.filter((u) => u.status === 'active').length;
  const totalResults = db.quiz_results.length;

  // Average score & Pass rate
  const totalScoreSum = db.quiz_results.reduce((acc, r) => acc + (r.score || 0), 0);
  const avgScore = totalResults > 0 ? Number((totalScoreSum / totalResults).toFixed(2)) : 0;
  const passCount = db.quiz_results.filter((r) => r.score >= 5.0).length;
  const passRate = totalResults > 0 ? Math.round((passCount / totalResults) * 100) : 0;

  // Score distribution [0-2, 2-4, 4-6, 6-8, 8-10]
  const scoreBuckets = [0, 0, 0, 0, 0];
  db.quiz_results.forEach((r) => {
    const s = r.score;
    if (s < 2) scoreBuckets[0]++;
    else if (s < 4) scoreBuckets[1]++;
    else if (s < 6) scoreBuckets[2]++;
    else if (s < 8) scoreBuckets[3]++;
    else scoreBuckets[4]++;
  });

  // Recent 5 activity logs
  const recentLogs = db.activity_logs.slice(0, 8);

  return res.json({
    kpis: {
      totalKeys,
      unusedKeys,
      activeKeys,
      expiredKeys,
      revokedKeys,
      totalUsers,
      activeUsers,
      totalResults,
      avgScore,
      passRate,
    },
    scoreDistribution: [
      { range: '0 - 2 điểm', count: scoreBuckets[0] },
      { range: '2 - 4 điểm', count: scoreBuckets[1] },
      { range: '4 - 6 điểm', count: scoreBuckets[2] },
      { range: '6 - 8 điểm', count: scoreBuckets[3] },
      { range: '8 - 10 điểm', count: scoreBuckets[4] },
    ],
    recentLogs,
    systemSettings: {
      freeAccessMode: !!db.system_settings.freeAccessMode,
      freeAccessUpdatedAt: db.system_settings.freeAccessUpdatedAt || null,
      freeAccessUpdatedBy: db.system_settings.freeAccessUpdatedBy || null,
    },
  });
});

// Admin toggle Access Mode (Free vs Key-restricted)
router.post('/admin/system/access-mode', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { freeAccessMode } = req.body;
  if (typeof freeAccessMode !== 'boolean') {
    return res.status(400).json({ error: 'Giá trị freeAccessMode phải là kiểu boolean (true hoặc false)' });
  }

  const db = getDb();
  db.system_settings.freeAccessMode = freeAccessMode;
  db.system_settings.freeAccessUpdatedAt = new Date().toISOString();
  db.system_settings.freeAccessUpdatedBy = session.username;

  logActivity(
    session.username,
    'Đổi chế độ truy cập',
    freeAccessMode
      ? 'Đã BẬT chế độ mở truy cập Quiz miễn phí (toàn bộ học sinh vào làm bài không cần Key)'
      : 'Đã TẮT chế độ miễn phí, quay về chế độ yêu cầu Key 5 giờ & 1 thiết bị',
    req.ip || '127.0.0.1',
    'success'
  );

  saveDbImmediate();

  return res.json({
    success: true,
    message: freeAccessMode
      ? 'Đã BẬT chế độ mở truy cập miễn phí thành công!'
      : 'Đã TẮT chế độ miễn phí, kích hoạt lại yêu cầu Key 5 giờ thành công!',
    freeAccessMode: db.system_settings.freeAccessMode,
    updatedAt: db.system_settings.freeAccessUpdatedAt,
    updatedBy: db.system_settings.freeAccessUpdatedBy,
    settings: db.system_settings,
  });
});

// ==========================================
// 4. ADMIN ACCESS KEY MANAGEMENT APIS
// ==========================================

router.get('/admin/keys', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const { search, status } = req.query;

  let list = [...db.access_keys];

  if (status && status !== 'all') {
    list = list.filter((k) => k.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (k) =>
        k.key.toLowerCase().includes(q) ||
        k.boundUserName?.toLowerCase().includes(q) ||
        k.boundDeviceId?.toLowerCase().includes(q) ||
        k.notes?.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(list);
});

// Generate 1 or Bulk Keys
router.post('/admin/keys/create', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { count = 1, prefix = 'QUIZ', durationHours = 5, notes = '' } = req.body;
  const numCount = Math.min(Math.max(Number(count) || 1, 1), 200);

  const db = getDb();
  const createdKeys: AccessKey[] = [];

  for (let i = 0; i < numCount; i++) {
    const newKeyStr = generateAccessKey(prefix.trim().toUpperCase());
    const newKey: AccessKey = {
      id: `key_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      key: newKeyStr,
      status: 'unused',
      durationHours: Number(durationHours) || 5,
      createdAt: new Date().toISOString(),
      activatedAt: null,
      expiresAt: null,
      boundDeviceId: null,
      boundDeviceInfo: null,
      boundUserId: null,
      boundUserName: null,
      notes: notes || '',
      createdBy: session.username,
    };
    db.access_keys.unshift(newKey);
    createdKeys.push(newKey);
  }

  logActivity(session.username, 'Tạo Key truy cập', `Đã tạo ${numCount} Key mới (Thời hạn: ${durationHours}h, Tiền tố: ${prefix})`, req.ip || '127.0.0.1', 'success');
  saveDb();

  return res.json({
    success: true,
    message: `Đã tạo thành công ${numCount} Key mới!`,
    keys: createdKeys,
  });
});

// Delete all active keys
router.post('/admin/keys/delete-active', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const db = getDb();
  const activeKeys = db.access_keys.filter((k) => k.status === 'active');
  const activeKeySet = new Set(activeKeys.map((k) => k.key));

  db.access_keys = db.access_keys.filter((k) => k.status !== 'active');
  db.device_sessions = db.device_sessions.filter((s) => !activeKeySet.has(s.key));

  logActivity(
    session.username,
    'Xóa toàn bộ Key hoạt động',
    `Đã xóa ${activeKeys.length} Key đang hoạt động`,
    req.ip || '127.0.0.1',
    'warning'
  );
  saveDbImmediate();

  return res.json({
    success: true,
    deletedCount: activeKeys.length,
    message: `Đã xóa thành công toàn bộ ${activeKeys.length} Key đang hoạt động!`,
  });
});

// Key actions: revoke, lock, unlock, extend, reset_device, delete
router.post('/admin/keys/:id/action', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { id } = req.params;
  const { action, addHours } = req.body;

  const db = getDb();
  const key = db.access_keys.find((k) => k.id === id);

  if (!key) {
    return res.status(404).json({ error: 'Không tìm thấy Key' });
  }

  const now = Date.now();

  switch (action) {
    case 'revoke':
      key.status = 'revoked';
      // Terminate any active sessions with this key
      db.device_sessions = db.device_sessions.filter((s) => s.key !== key.key);
      logActivity(session.username, 'Thu hồi Key', `Thu hồi Key ${key.key}`, req.ip || '127.0.0.1', 'warning');
      break;

    case 'lock':
      key.status = 'locked';
      db.device_sessions = db.device_sessions.filter((s) => s.key !== key.key);
      logActivity(session.username, 'Khóa Key', `Khóa Key ${key.key}`, req.ip || '127.0.0.1', 'warning');
      break;

    case 'unlock':
      if (key.expiresAt && new Date(key.expiresAt).getTime() > now) {
        key.status = 'active';
      } else if (!key.activatedAt) {
        key.status = 'unused';
      } else {
        key.status = 'expired';
      }
      logActivity(session.username, 'Mở khóa Key', `Mở khóa Key ${key.key}`, req.ip || '127.0.0.1', 'success');
      break;

    case 'reset_device':
      const prevDevice = key.boundDeviceId;
      key.boundDeviceId = null;
      key.boundDeviceInfo = null;
      db.device_sessions = db.device_sessions.filter((s) => s.key !== key.key);
      logActivity(session.username, 'Reset thiết bị Key', `Đã xóa liên kết thiết bị [${prevDevice}] cho Key ${key.key}`, req.ip || '127.0.0.1', 'success');
      break;

    case 'extend':
      const extra = Number(addHours) || 5;
      const baseTime = key.expiresAt && new Date(key.expiresAt).getTime() > now
        ? new Date(key.expiresAt).getTime()
        : now;
      key.expiresAt = new Date(baseTime + extra * 3600 * 1000).toISOString();
      key.status = 'active';
      logActivity(session.username, 'Gia hạn Key', `Gia hạn thêm ${extra} giờ cho Key ${key.key}`, req.ip || '127.0.0.1', 'success');
      break;

    case 'delete':
      db.access_keys = db.access_keys.filter((k) => k.id !== id);
      db.device_sessions = db.device_sessions.filter((s) => s.key !== key.key);
      logActivity(session.username, 'Xóa Key', `Đã xóa hoàn toàn Key ${key.key}`, req.ip || '127.0.0.1', 'warning');
      saveDb();
      return res.json({ success: true, message: 'Đã xóa Key thành công' });

    default:
      return res.status(400).json({ error: 'Hành động không hợp lệ' });
  }

  saveDb();
  return res.json({ success: true, key });
});

// ==========================================
// 5. ADMIN USER MANAGEMENT APIS
// ==========================================

router.get('/admin/users', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const { search, status } = req.query;

  let list = [...db.users];

  if (status && status !== 'all') {
    list = list.filter((u) => u.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.key.toLowerCase().includes(q) ||
        u.deviceId.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime());
  return res.json(list);
});

router.post('/admin/users/:id/action', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { id } = req.params;
  const { action } = req.body;

  const db = getDb();
  const user = db.users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }

  switch (action) {
    case 'lock':
      user.status = 'locked';
      db.device_sessions = db.device_sessions.filter((s) => s.userId !== id);
      logActivity(session.username, 'Khóa người dùng', `Khóa người chơi [${user.name}]`, req.ip || '127.0.0.1', 'warning');
      break;

    case 'unlock':
      user.status = 'active';
      logActivity(session.username, 'Mở khóa người dùng', `Mở khóa người chơi [${user.name}]`, req.ip || '127.0.0.1', 'success');
      break;

    case 'reset_device':
      user.deviceId = '';
      const linkedKey = db.access_keys.find((k) => k.key === user.key);
      if (linkedKey) {
        linkedKey.boundDeviceId = null;
      }
      db.device_sessions = db.device_sessions.filter((s) => s.userId !== id);
      logActivity(session.username, 'Reset thiết bị người chơi', `Reset thiết bị cho [${user.name}]`, req.ip || '127.0.0.1', 'success');
      break;

    case 'delete':
      db.users = db.users.filter((u) => u.id !== id);
      db.device_sessions = db.device_sessions.filter((s) => s.userId !== id);
      logActivity(session.username, 'Xóa người dùng', `Xóa tài khoản người chơi [${user.name}]`, req.ip || '127.0.0.1', 'warning');
      saveDb();
      return res.json({ success: true, message: 'Đã xóa người dùng' });

    default:
      return res.status(400).json({ error: 'Hành động không hợp lệ' });
  }

  saveDb();
  return res.json({ success: true, user });
});

// ==========================================
// 6. ADMIN QUIZ MANAGEMENT APIS
// ==========================================

router.get('/admin/quizzes', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    quizzes: db.quizzes,
    totalQuestions: db.questions.length,
  });
});

router.post('/admin/quizzes/update', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { id, updates } = req.body;

  const db = getDb();
  const quiz = db.quizzes.find((q) => q.id === id);

  if (!quiz) {
    return res.status(404).json({ error: 'Không tìm thấy bài Quiz' });
  }

  Object.assign(quiz, updates);
  logActivity(session.username, 'Cập nhật cấu hình Quiz', `Cập nhật bài thi "${quiz.title}"`, req.ip || '127.0.0.1', 'success');
  saveDb();

  return res.json({ success: true, quiz });
});

// ==========================================
// 7. ADMIN QUIZ RESULTS & LEADERBOARD APIS
// ==========================================

router.get('/admin/results', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const { search } = req.query;

  let list = [...db.quiz_results];

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (r) =>
        r.userName.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        r.quizTitle.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  return res.json(list);
});

router.delete('/admin/results/:id', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { id } = req.params;
  const db = getDb();
  db.quiz_results = db.quiz_results.filter((r) => r.id !== id);
  logActivity(session.username, 'Xóa kết quả thi', `Đã xóa bản ghi kết quả [${id}]`, req.ip || '127.0.0.1', 'warning');
  saveDb();
  return res.json({ success: true, message: 'Đã xóa kết quả bài thi' });
});

router.get('/admin/leaderboard', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  // Rank by highest score, then fastest time
  const topScores = [...db.quiz_results]
    .sort((a, b) => b.score - a.score || a.timeSpentSeconds - b.timeSpentSeconds)
    .slice(0, 20);

  // Top active users by attempts
  const topAttempts = [...db.users]
    .sort((a, b) => (b.totalAttempts || 0) - (a.totalAttempts || 0))
    .slice(0, 10);

  return res.json({
    topScores,
    topAttempts,
  });
});

// ==========================================
// 8. AUDIT LOGS & SETTINGS APIS
// ==========================================

router.get('/admin/logs', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  return res.json(db.activity_logs);
});

router.get('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ success: true, settings: db.system_settings });
});

router.post('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const db = getDb();
  Object.assign(db.system_settings, req.body);
  logActivity(session.username, 'Thay đổi cài đặt hệ thống', 'Đã lưu thay đổi cấu hình hệ thống', req.ip || '127.0.0.1', 'success');
  saveDb();
  return res.json({ success: true, settings: db.system_settings });
});

// Admin accounts management
router.get('/admin/admins', requireAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const safeAdmins = db.admins.map((a) => ({
    id: a.id,
    username: a.username,
    name: a.name,
    role: a.role,
    createdAt: a.createdAt,
    lastLoginAt: a.lastLoginAt,
  }));
  return res.json(safeAdmins);
});

router.post('/admin/admins/create', requireSuperAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { username, password, name, role } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  const db = getDb();
  const exists = db.admins.some((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng' });
  }

  const newAdmin: AdminUser = {
    id: `admin_${Date.now()}`,
    username: username.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    name: name.trim(),
    role: role === 'moderator' ? 'moderator' : 'admin',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  db.admins.push(newAdmin);
  logActivity(session.username, 'Tạo Quản trị viên mới', `Đã tạo admin [${newAdmin.username}] quyền [${newAdmin.role}]`, req.ip || '127.0.0.1', 'success');
  saveDb();

  return res.json({ success: true, message: 'Tạo tài khoản quản trị viên thành công' });
});

router.post('/admin/admins/change-password', requireAdmin, (req: Request, res: Response) => {
  const session = (req as any).admin;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  const db = getDb();
  const admin = db.admins.find((a) => a.id === session.adminId);
  if (!admin) {
    return res.status(404).json({ error: 'Admin không tồn tại' });
  }

  if (admin.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác' });
  }

  admin.passwordHash = hashPassword(newPassword);
  logActivity(session.username, 'Đổi mật khẩu Admin', 'Đã đổi mật khẩu tài khoản thành công', req.ip || '127.0.0.1', 'success');
  saveDb();

  return res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
});

// Database Backup & Restore
router.get('/admin/backup', requireSuperAdmin, (req: Request, res: Response) => {
  const db = getDb();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="quiz_backup_${Date.now()}.json"`);
  return res.send(JSON.stringify(db, null, 2));
});
