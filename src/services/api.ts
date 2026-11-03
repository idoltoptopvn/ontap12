// API client for Player & Admin interactions with Express backend

const API_BASE = '/api';

// Player token storage
export const getPlayerToken = () => localStorage.getItem('player_token');
export const setPlayerToken = (token: string) => localStorage.setItem('player_token', token);
export const removePlayerToken = () => localStorage.removeItem('player_token');

// Admin token storage
export const getAdminToken = () => localStorage.getItem('admin_token');
export const setAdminToken = (token: string) => localStorage.setItem('admin_token', token);
export const removeAdminToken = () => localStorage.removeItem('admin_token');

// Helper to get or create stable device identifier
export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('device_fingerprint_id');
  if (!id) {
    const raw = `${navigator.userAgent}_${screen.width}x${screen.height}_${Date.now()}_${Math.random()}`;
    id = 'dev_' + btoa(raw).replace(/[^a-zA-Z0-9]/g, '').substring(0, 24);
    localStorage.setItem('device_fingerprint_id', id);
  }
  return id;
}

export function getDeviceSummary(): string {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const platform = isMobile ? 'Mobile' : 'Desktop';
  return `${platform} (${navigator.platform || 'Web'}) - ${screen.width}x${screen.height}`;
}

// Player APIs
export async function activateKey(key: string, name: string) {
  const deviceId = getOrCreateDeviceId();
  const deviceInfo = getDeviceSummary();

  const res = await fetch(`${API_BASE}/key/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, name, deviceId, deviceInfo }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kích hoạt Key thất bại');
  }
  if (data.token) {
    setPlayerToken(data.token);
  }
  return data;
}

export async function checkPlayerSession() {
  const token = getPlayerToken();
  if (!token) return { authenticated: false };

  try {
    const res = await fetch(`${API_BASE}/key/session?token=${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok || !data.authenticated) {
      removePlayerToken();
      return { authenticated: false, error: data.error };
    }
    return { success: true, session: data, ...data };
  } catch {
    return { authenticated: false };
  }
}

export async function submitQuizScore(
  quizIdOrAnswers: string | any,
  answersOrTime?: any,
  timeSpentSeconds?: number
) {
  let quizId = 'quiz_tin12_gk1';
  let answers = quizIdOrAnswers;
  let timeSpent = answersOrTime || 0;

  if (typeof quizIdOrAnswers === 'string') {
    quizId = quizIdOrAnswers;
    answers = answersOrTime;
    timeSpent = timeSpentSeconds || 0;
  }

  const token = getPlayerToken();
  const res = await fetch(`${API_BASE}/quiz/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quizId, answers, timeSpentSeconds: timeSpent, token }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Nộp bài thất bại');
  }
  return { success: true, result: data.result || data };
}

// Admin APIs
export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Đăng nhập quản trị viên thất bại');
  }
  if (data.token) {
    setAdminToken(data.token);
  }
  return data;
}

export async function adminGetMe() {
  const token = getAdminToken();
  if (!token) {
    return { success: false, authenticated: false };
  }

  try {
    const res = await fetch(`${API_BASE}/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      removeAdminToken();
      return { success: false, authenticated: false, error: data.error };
    }
    return data;
  } catch {
    return { success: false, authenticated: false };
  }
}

export async function adminLogout() {
  const token = getAdminToken();
  try {
    if (token) {
      await fetch(`${API_BASE}/admin/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } finally {
    removeAdminToken();
  }
}

export async function adminFetch(endpoint: string, options: RequestInit = {}) {
  const token = getAdminToken();
  if (!token) throw new Error('Chưa đăng nhập');

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Yêu cầu thất bại');
  }
  return data;
}

export async function adminGetSettings() {
  return adminFetch('/admin/settings');
}

export async function adminUpdateSettings(settings: any) {
  return adminFetch('/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

export async function adminDownloadBackup() {
  return adminFetch('/admin/backup');
}

// Transfer Token APIs for Facebook In-App Browser to Safari/Chrome migration
export async function createTransferToken(key: string) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch(`${API_BASE}/key/create-transfer-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, deviceId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tạo mã chuyển đổi');
  }
  return data;
}

export async function claimTransferToken(key: string, transferToken: string) {
  const newDeviceId = getOrCreateDeviceId();
  const newDeviceInfo = getDeviceSummary();

  const res = await fetch(`${API_BASE}/key/claim-transfer-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      transferToken,
      newDeviceId,
      newDeviceInfo,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể đồng bộ phiên sang trình duyệt này');
  }
  if (data.token) {
    setPlayerToken(data.token);
  }
  return data;
}

// Access Mode APIs
export async function getAccessMode(): Promise<{
  success: boolean;
  freeAccessMode: boolean;
  updatedAt?: string;
  updatedBy?: string;
  siteName?: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/system/access-mode`);
    if (!res.ok) return { success: false, freeAccessMode: false };
    return await res.json();
  } catch {
    return { success: false, freeAccessMode: false };
  }
}

export async function adminUpdateAccessMode(freeAccessMode: boolean) {
  return adminFetch('/admin/system/access-mode', {
    method: 'POST',
    body: JSON.stringify({ freeAccessMode }),
  });
}

export async function startGuestSession(name?: string) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch(`${API_BASE}/quiz/guest-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, deviceId }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Không thể tạo phiên làm bài');
  }
  if (data.token) {
    setPlayerToken(data.token);
  }
  return data;
}
