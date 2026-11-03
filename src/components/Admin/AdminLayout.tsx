import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Key, 
  Users, 
  FileText, 
  Award, 
  BarChart3, 
  ScrollText, 
  ShieldCheck, 
  Settings, 
  LogOut, 
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard';
import { AdminKeys } from './AdminKeys';
import { AdminUsers } from './AdminUsers';
import { AdminQuizzes } from './AdminQuizzes';
import { AdminResults } from './AdminResults';
import { AdminLeaderboard } from './AdminLeaderboard';
import { AdminLogs } from './AdminLogs';
import { AdminAccounts } from './AdminAccounts';
import AdminSettings from './AdminSettings';
import { adminLogout } from '../../services/api';

interface AdminLayoutProps {
  admin: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
  onLogout: () => void;
  onExitToQuiz: () => void;
}

type TabType = 
  | 'dashboard' 
  | 'keys' 
  | 'users' 
  | 'quizzes' 
  | 'results' 
  | 'leaderboard' 
  | 'logs' 
  | 'accounts' 
  | 'settings';

export default function AdminLayout({ admin, onLogout, onExitToQuiz }: AdminLayoutProps) {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'keys' as TabType, label: 'Quản lý Key', icon: Key },
    { id: 'users' as TabType, label: 'Học sinh & Thiết bị', icon: Users },
    { id: 'quizzes' as TabType, label: 'Bài thi & Cấu hình', icon: FileText },
    { id: 'results' as TabType, label: 'Kết quả làm bài', icon: Award },
    { id: 'leaderboard' as TabType, label: 'Bảng xếp hạng', icon: BarChart3 },
    { id: 'logs' as TabType, label: 'Nhật ký Audit', icon: ScrollText },
    { id: 'accounts' as TabType, label: 'Quản trị viên', icon: ShieldCheck },
    { id: 'settings' as TabType, label: 'Cài đặt hệ thống', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await adminLogout();
    } finally {
      onLogout();
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Super Admin</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Admin</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Moderator</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            Q
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 leading-none">Quiz Admin</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Control Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExitToQuiz}
            className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100"
            title="Quay lại Quiz"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 rounded-lg hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile drawer */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-64 bg-slate-900 text-white z-50 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/30 text-lg">
              Q
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white">QUIZ ADMIN</div>
              <div className="text-[11px] text-slate-400">Hệ thống Quản trị & Key</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
            Menu Quản lý
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer Admin Profile */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-blue-400 text-sm">
              {admin.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{admin.name}</div>
              <div className="text-[10px] text-slate-400 truncate">@{admin.username}</div>
            </div>
            <div>{getRoleBadge(admin.role)}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onExitToQuiz}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
              title="Mở giao diện làm bài"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Xem Quiz
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 text-[11px] font-medium transition-colors border border-red-900/50"
            >
              <LogOut className="w-3.5 h-3.5" /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Top desktop header bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-4 items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Admin Portal</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 capitalize">
              {navItems.find((n) => n.id === currentTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onExitToQuiz}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Vào giao diện làm bài
            </button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Xin chào, <strong className="text-slate-900">{admin.name}</strong></span>
              {getRoleBadge(admin.role)}
            </div>
          </div>
        </header>

        {/* Tab Content Render */}
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          {currentTab === 'dashboard' && <AdminDashboard onNavigate={(tab) => setCurrentTab(tab as TabType)} />}
          {currentTab === 'keys' && <AdminKeys />}
          {currentTab === 'users' && <AdminUsers />}
          {currentTab === 'quizzes' && <AdminQuizzes />}
          {currentTab === 'results' && <AdminResults />}
          {currentTab === 'leaderboard' && <AdminLeaderboard />}
          {currentTab === 'logs' && <AdminLogs />}
          {currentTab === 'accounts' && <AdminAccounts currentAdmin={admin} />}
          {currentTab === 'settings' && <AdminSettings />}
        </div>
      </main>
    </div>
  );
}
