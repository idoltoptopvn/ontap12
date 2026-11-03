import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RAW_QUESTIONS } from '../src/data/quizQuestions';
import { Question } from '../src/types';

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'super_admin' | 'admin' | 'moderator';
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AccessKey {
  id: string;
  key: string; // e.g. QUIZ-A7K9-X2LM-P8RT
  status: 'unused' | 'active' | 'expired' | 'revoked' | 'locked';
  durationHours: number; // default 5
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  boundDeviceId: string | null;
  boundDeviceInfo: string | null;
  boundUserId: string | null;
  boundUserName: string | null;
  notes: string;
  createdBy: string;
}

export interface QuizUser {
  id: string;
  name: string;
  key: string;
  deviceId: string;
  deviceInfo: string;
  activatedAt: string;
  expiresAt: string;
  status: 'active' | 'locked' | 'expired' | 'revoked';
  highestScore: number;
  totalAttempts: number;
  lastActiveAt: string;
}

export interface QuizInfo {
  id: string;
  title: string;
  description: string;
  topic: string;
  totalQuestions: number;
  durationMinutes: number;
  maxAttempts: number;
  allowViewAnswers: boolean;
  allowViewExplanation: boolean;
  practiceModeEnabled: boolean;
  examModeEnabled: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  passingScore: number;
  maxScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface QuizResultRecord {
  id: string;
  userId: string;
  userName: string;
  key: string;
  quizId: string;
  quizTitle: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  completedAt: string;
  userAnswers: any;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  ip: string;
  status: 'success' | 'warning' | 'error';
}

export interface SystemSettings {
  siteName: string;
  logoText: string;
  siteDescription: string;
  defaultKeyDurationHours: number;
  defaultMaxDevices: number;
  allowKeyCreation: boolean;
  allowKeyActivation: boolean;
  allowKeyExtension: boolean;
  allowDeviceReset: boolean;
  practiceModeEnabled: boolean;
  examModeEnabled: boolean;
  showExplanation: boolean;
  showAnswers: boolean;
  systemLocked: boolean;
  freeAccessMode: boolean;
  freeAccessUpdatedAt?: string;
  freeAccessUpdatedBy?: string;
}

export interface DeviceSession {
  token: string;
  userId: string;
  key: string;
  deviceId: string;
  ip: string;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  admins: AdminUser[];
  users: QuizUser[];
  access_keys: AccessKey[];
  quizzes: QuizInfo[];
  questions: Question[];
  quiz_attempts: any[];
  quiz_results: QuizResultRecord[];
  activity_logs: ActivityLog[];
  system_settings: SystemSettings;
  device_sessions: DeviceSession[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');
const BACKUP_FILE = path.resolve(DATA_DIR, 'db.backup.json');

// Password hash helper (SHA-256 with salt)
export function hashPassword(password: string): string {
  const salt = 'quiz_security_salt_2026_';
  return crypto.createHash('sha256').update(salt + password).digest('hex');
}

// Generate randomized secure Key: QUIZ-XXXX-XXXX-XXXX
export function generateAccessKey(prefix: string = 'QUIZ'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O, 0, I, 1 to avoid confusion
  const getChunk = (len: number) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };
  return `${prefix}-${getChunk(4)}-${getChunk(4)}-${getChunk(4)}`;
}

let dbCache: DatabaseSchema | null = null;
let isSaving = false;
let pendingSave = false;
let saveTimeout: NodeJS.Timeout | null = null;

export function getDb(): DatabaseSchema {
  if (dbCache) return dbCache;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbCache = JSON.parse(raw);
      // Ensure questions is always initialized with RAW_QUESTIONS
      if (!dbCache!.questions || dbCache!.questions.length === 0) {
        dbCache!.questions = RAW_QUESTIONS;
      }
      if (!dbCache!.system_settings) {
        dbCache!.system_settings = {} as any;
      }
      if (typeof dbCache!.system_settings.freeAccessMode !== 'boolean') {
        dbCache!.system_settings.freeAccessMode = false;
        dbCache!.system_settings.freeAccessUpdatedAt = new Date().toISOString();
        dbCache!.system_settings.freeAccessUpdatedBy = 'Hệ thống';
      }
      return dbCache!;
    } catch (e) {
      console.error('Error reading db.json, falling back to backup or fresh init', e);
      if (fs.existsSync(BACKUP_FILE)) {
        try {
          const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
          dbCache = JSON.parse(raw);
          if (!dbCache!.questions || dbCache!.questions.length === 0) {
            dbCache!.questions = RAW_QUESTIONS;
          }
          return dbCache!;
        } catch (backupErr) {
          console.error('Error reading backup file', backupErr);
        }
      }
    }
  }

  // Initialize fresh database with default data
  const defaultSuperAdmin: AdminUser = {
    id: 'admin_1',
    username: 'admin',
    passwordHash: hashPassword('Admin@123456'), // Default Admin credentials
    role: 'super_admin',
    name: 'Super Admin',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  const defaultQuiz: QuizInfo = {
    id: 'quiz_tin12_gk1',
    title: 'Đề Cương Ôn Thi Tin Học 12 Giữa Kỳ 1',
    description: 'Ngân hàng câu hỏi GK1 2026-2027 đầy đủ Chủ đề A, B, D (128 câu hỏi chuẩn)',
    topic: 'Tin Học 12',
    totalQuestions: RAW_QUESTIONS.length,
    durationMinutes: 45,
    maxAttempts: 10,
    allowViewAnswers: true,
    allowViewExplanation: true,
    practiceModeEnabled: true,
    examModeEnabled: true,
    shuffleQuestions: false,
    shuffleOptions: false,
    passingScore: 5.0,
    maxScore: 10.0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  // No default demo keys - keys are only created by Admin
  const starterKeys: AccessKey[] = [];

  const defaultSettings: SystemSettings = {
    siteName: 'Hệ Thống Quản Trị & Khảo Thí Quiz Pro',
    logoText: 'QuizPro KeyManager',
    siteDescription: 'Nền tảng kiểm soát truy cập và bảo mật bài thi trắc nghiệm',
    defaultKeyDurationHours: 5,
    defaultMaxDevices: 1,
    allowKeyCreation: true,
    allowKeyActivation: true,
    allowKeyExtension: true,
    allowDeviceReset: true,
    practiceModeEnabled: true,
    examModeEnabled: true,
    showExplanation: true,
    showAnswers: true,
    systemLocked: false,
    freeAccessMode: false,
    freeAccessUpdatedAt: new Date().toISOString(),
    freeAccessUpdatedBy: 'Hệ thống',
  };

  const initialLogs: ActivityLog[] = [
    {
      id: 'log_init',
      timestamp: new Date().toISOString(),
      actor: 'System',
      action: 'Khởi tạo hệ thống',
      details: 'Khởi tạo cơ sở dữ liệu và tài khoản Quản trị Super Admin thành công',
      ip: '127.0.0.1',
      status: 'success',
    },
  ];

  dbCache = {
    admins: [defaultSuperAdmin],
    users: [],
    access_keys: starterKeys,
    quizzes: [defaultQuiz],
    questions: RAW_QUESTIONS,
    quiz_attempts: [],
    quiz_results: [],
    activity_logs: initialLogs,
    system_settings: defaultSettings,
    device_sessions: [],
  };

  saveDbImmediate();
  return dbCache;
}

// Write serialization lock to prevent concurrent file corruption
let writeQueue = Promise.resolve();
let isWriteScheduled = false;

function performAtomicWrite(): void {
  if (!dbCache) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const json = JSON.stringify(dbCache, null, 2);
    const uniqueId = `${process.pid}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const tempFile = path.resolve(DATA_DIR, `db_${uniqueId}.tmp`);

    fs.writeFileSync(tempFile, json, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (e) {
    console.error('Failed to save database file atomically:', e);
  }
}

export function saveDbImmediate(): void {
  performAtomicWrite();
}

// Concurrency-safe debounced queue for saves (batches 200 simultaneous requests into safe atomic writes)
export function saveDb(): void {
  if (isWriteScheduled) return;
  isWriteScheduled = true;
  setTimeout(() => {
    isWriteScheduled = false;
    writeQueue = writeQueue.then(() => {
      performAtomicWrite();
    }).catch(err => {
      console.error('Error during queued saveDb:', err);
    });
  }, 25);
}

// Helper to log activities
export function logActivity(actor: string, action: string, details: string, ip: string = '127.0.0.1', status: 'success' | 'warning' | 'error' = 'success') {
  const db = getDb();
  const log: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
    ip,
    status,
  };
  db.activity_logs.unshift(log);
  if (db.activity_logs.length > 500) {
    db.activity_logs = db.activity_logs.slice(0, 500);
  }
  saveDb();
}
