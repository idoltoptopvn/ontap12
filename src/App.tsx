import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RAW_QUESTIONS } from './data/quizQuestions';
import { Question, UserAnswers } from './types';
import { Header } from './components/Header';
import { Flashcard } from './components/Flashcard';
import { CardDeckDrawer } from './components/CardDeckDrawer';
import { KeyActivationScreen } from './components/KeyActivationScreen';
import { PlayerTopBar } from './components/PlayerTopBar';
import { PlayerResultModal } from './components/PlayerResultModal';
import { AdminLogin } from './components/Admin/AdminLogin';
import AdminLayout from './components/Admin/AdminLayout';
import { 
  checkPlayerSession, 
  adminGetMe, 
  submitQuizScore, 
  getPlayerToken,
  getAdminToken,
  removePlayerToken,
  claimTransferToken,
  getAccessMode,
  startGuestSession
} from './services/api';
import { FacebookBrowserNotice } from './components/FacebookBrowserNotice';
import {
  saveFlashcardProgress,
  loadFlashcardProgress,
  clearFlashcardProgress,
  calculateSummary,
} from './utils/quizHelper';
import { RotateCcw, AlertTriangle, Send, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Navigation mode: 'player' (Quiz/Flashcard) or 'admin'
  const [mode, setMode] = useState<'player' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin')) {
        return 'admin';
      }
    }
    return 'player';
  });

  // Authentication & Session states
  const [playerSession, setPlayerSession] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isFreeMode, setIsFreeMode] = useState<boolean>(false);
  const [modeNotification, setModeNotification] = useState<string | null>(null);

  // Quiz state
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [deck, setDeck] = useState<Question[]>(RAW_QUESTIONS);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [quizStartTime] = useState<number>(() => Date.now());

  const [userAnswers, setUserAnswers] = useState<UserAnswers>({
    singleChoice: {},
    trueFalse: {},
    shortAnswer: {},
  });
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [preloadedKey, setPreloadedKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return (p.get('key') || '').toUpperCase();
    }
    return '';
  });

  // Initial check for player session, migration token, and admin session
  useEffect(() => {
    let isMounted = true;

    async function initSessions() {
      try {
        // 0. Check Access Mode from server
        let serverFreeMode = false;
        try {
          const modeRes = await getAccessMode();
          if (isMounted && modeRes) {
            serverFreeMode = !!modeRes.freeAccessMode;
            setIsFreeMode(serverFreeMode);
          }
        } catch {
          // Continue on mode check failure
        }

        // 1. Check if opened via external browser migration (Facebook -> Safari/Chrome)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const transferToken = urlParams.get('transfer_token');
          const transferKey = urlParams.get('key');

          if (transferToken && transferKey) {
            try {
              const claimRes = await claimTransferToken(transferKey, transferToken);
              if (isMounted && claimRes?.success && claimRes.token) {
                setPlayerSession(claimRes);
                // Clean migration query params from URL address bar
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                return;
              }
            } catch (claimErr) {
              console.warn('Could not claim transfer token:', claimErr);
            }
          }
        }

        // 2. Check Admin session if token exists
        const adminToken = getAdminToken();
        if (adminToken) {
          try {
            const adminRes = await adminGetMe();
            if (isMounted && adminRes?.success && adminRes.admin) {
              setAdminUser(adminRes.admin);
            }
          } catch {
            // Not authenticated as admin, continue normally
          }
        }

        // 3. Handle Player session depending on serverFreeMode
        const playerToken = getPlayerToken();

        if (serverFreeMode) {
          // FREE ACCESS MODE: Try to restore or auto-start free session
          let sessionRestored = false;
          if (playerToken) {
            try {
              const sessRes = await checkPlayerSession();
              if (isMounted && (sessRes?.success || sessRes?.authenticated)) {
                setPlayerSession(sessRes.session || sessRes);
                sessionRestored = true;
              }
            } catch {
              // Ignore and start new guest session below
            }
          }

          if (!sessionRestored && isMounted) {
            try {
              const guestRes = await startGuestSession('Học sinh Lớp 12');
              if (isMounted && guestRes?.success) {
                setPlayerSession({
                  ...guestRes,
                  freeAccessMode: true,
                  studentName: guestRes.name || 'Học sinh Lớp 12',
                  userName: guestRes.name || 'Học sinh Lớp 12',
                });
              }
            } catch (guestErr) {
              console.warn('Auto guest session startup error:', guestErr);
            }
          }
        } else {
          // KEY-RESTRICTED MODE: Strictly check valid paid key session
          if (playerToken && playerToken.startsWith('guest_free_')) {
            // Previous token was a free guest session from when free mode was on -> Invalidate it!
            removePlayerToken();
            if (isMounted) setPlayerSession(null);
          } else if (playerToken) {
            try {
              const sessRes = await checkPlayerSession();
              if (isMounted && (sessRes?.success || sessRes?.authenticated)) {
                setPlayerSession(sessRes.session || sessRes);
              } else {
                removePlayerToken();
                if (isMounted) setPlayerSession(null);
              }
            } catch {
              removePlayerToken();
              if (isMounted) setPlayerSession(null);
            }
          }
        }
      } catch (err) {
        // Safe fallback - avoid crashing app initialization
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    initSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time synchronization of server Access Mode changes
  useEffect(() => {
    if (mode === 'admin') return;

    const interval = setInterval(async () => {
      try {
        const modeRes = await getAccessMode();
        const currentServerFree = !!modeRes?.freeAccessMode;

        if (currentServerFree !== isFreeMode) {
          setIsFreeMode(currentServerFree);

          if (currentServerFree) {
            // Admin turned free mode ON!
            if (!playerSession) {
              const guestRes = await startGuestSession('Học sinh Lớp 12');
              if (guestRes?.success) {
                setPlayerSession({
                  ...guestRes,
                  freeAccessMode: true,
                  studentName: guestRes.name || 'Học sinh Lớp 12',
                  userName: guestRes.name || 'Học sinh Lớp 12',
                });
                setModeNotification('🟢 Quản trị viên đã mở truy cập tự do! Bạn có thể làm bài thi ngay.');
                setTimeout(() => setModeNotification(null), 6000);
              }
            }
          } else {
            // Admin turned free mode OFF!
            if (playerSession?.key === 'MIỄN PHÍ' || playerSession?.freeAccessMode) {
              removePlayerToken();
              setPlayerSession(null);
              setModeNotification('🔴 Chế độ miễn phí đã kết thúc. Vui lòng nhập Key bản quyền 5 giờ để tiếp tục.');
              setTimeout(() => setModeNotification(null), 8000);
            }
          }
        }
      } catch {
        // Safe silence on background polling
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [mode, isFreeMode, playerSession]);

  // Update browser URL history when mode changes
  const handleSwitchMode = (newMode: 'player' | 'admin') => {
    setMode(newMode);
    if (typeof window !== 'undefined' && window.history) {
      const targetPath = newMode === 'admin' ? '/admin' : '/';
      window.history.pushState({}, '', targetPath);
    }
  };

  // Sync mode on popstate / back button
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin')) {
        setMode('admin');
      } else {
        setMode('player');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load Quiz progress from LocalStorage
  useEffect(() => {
    const saved = loadFlashcardProgress();
    if (saved) {
      if (saved.answers) setUserAnswers(saved.answers);
      if (saved.bookmarks) setBookmarks(saved.bookmarks);
      if (saved.selectedTopic) setSelectedTopic(saved.selectedTopic);
      if (saved.currentIndex !== undefined && saved.currentIndex < RAW_QUESTIONS.length) {
        setCurrentIndex(saved.currentIndex);
      }
    }
  }, []);

  // Filter deck when topic changes
  useEffect(() => {
    let list = [...RAW_QUESTIONS];
    if (selectedTopic !== 'all') {
      list = list.filter((q) => {
        if (selectedTopic === 'A') return q.topic.includes('Chủ đề A');
        if (selectedTopic === 'B') return q.topic.includes('Chủ đề B');
        if (selectedTopic === 'D') return q.topic.includes('Chủ đề D');
        return true;
      });
    }
    setDeck(list);
    setCurrentIndex(0);
  }, [selectedTopic]);

  // Auto-save player progress
  useEffect(() => {
    saveFlashcardProgress({
      answers: userAnswers,
      bookmarks,
      currentIndex,
      selectedTopic,
    });
  }, [userAnswers, bookmarks, currentIndex, selectedTopic]);

  // Handlers for quiz answers
  const handleAnswerSingleChoice = useCallback((questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      singleChoice: {
        ...prev.singleChoice,
        [questionId]: optionIndex,
      },
    }));
  }, []);

  const handleAnswerTrueFalse = useCallback((questionId: string, subId: string, value: boolean) => {
    setUserAnswers((prev) => ({
      ...prev,
      trueFalse: {
        ...prev.trueFalse,
        [questionId]: {
          ...(prev.trueFalse[questionId] || {}),
          [subId]: value,
        },
      },
    }));
  }, []);

  const handleAnswerShortAnswer = useCallback((questionId: string, text: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      shortAnswer: {
        ...prev.shortAnswer,
        [questionId]: text,
      },
    }));
  }, []);

  const handleToggleBookmark = useCallback((questionId: string) => {
    setBookmarks((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  }, []);

  const handleShuffle = () => {
    setDeck((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmReset = () => {
    setUserAnswers({ singleChoice: {}, trueFalse: {}, shortAnswer: {} });
    setBookmarks({});
    setCurrentIndex(0);
    clearFlashcardProgress();
    setIsResetConfirmOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit test to server
  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitting(true);
      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - quizStartTime) / 1000));
      const studentName = playerSession?.userName || playerSession?.studentName || playerSession?.name || 'Học sinh';
      const res = await submitQuizScore(userAnswers, timeSpentSeconds);
      if (res.success && res.result) {
        setSubmittedResult(res.result);
        setIsSubmitConfirmOpen(false);
        setIsResultModalOpen(true);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('Key') || err.message.includes('miễn phí'))) {
        setModeNotification(err.message);
        removePlayerToken();
        setPlayerSession(null);
        setIsSubmitConfirmOpen(false);
      } else {
        setModeNotification('Lỗi nộp bài: ' + (err.message || 'Vui lòng thử lại'));
        setIsSubmitConfirmOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = useMemo(() => {
    return calculateSummary(deck, userAnswers);
  }, [deck, userAnswers]);

  const currentQ = deck[currentIndex] || deck[0];

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const handleStudyMistakesOnly = () => {
    const wrongQuestions = RAW_QUESTIONS.filter((q) => {
      if (q.type === 'single_choice') {
        const choice = userAnswers.singleChoice[q.id];
        return choice !== undefined && choice !== q.correctAnswer;
      }
      if (q.type === 'true_false') {
        const qAns = userAnswers.trueFalse[q.id] || {};
        const subs = q.tfSubQuestions || [];
        return Object.keys(qAns).length > 0 && subs.some((s) => qAns[s.id] !== undefined && qAns[s.id] !== s.isTrue);
      }
      if (q.type === 'short_answer') {
        const txt = userAnswers.shortAnswer[q.id]?.trim().toLowerCase();
        if (!txt) return false;
        return !q.correctShortAnswer?.some((a) => {
          const c = a.trim().toLowerCase();
          return txt === c || txt.replace(/\s+/g, '') === c.replace(/\s+/g, '');
        });
      }
      return false;
    });

    if (wrongQuestions.length > 0) {
      setDeck(wrongQuestions);
      setCurrentIndex(0);
      setIsDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'player' || !playerSession) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Enter' || e.key === ' ') {
        const isAnswered =
          currentQ?.type === 'single_choice'
            ? userAnswers.singleChoice[currentQ.id] !== undefined
            : currentQ?.type === 'true_false'
            ? Object.keys(userAnswers.trueFalse[currentQ?.id] || {}).length === (currentQ.tfSubQuestions?.length || 0)
            : !!userAnswers.shortAnswer[currentQ?.id]?.trim();

        if (isAnswered && currentIndex < deck.length - 1) {
          e.preventDefault();
          handleNext();
        }
      } else if (currentQ && currentQ.type === 'single_choice' && currentQ.options) {
        const key = e.key.toUpperCase();
        const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
        if (map[key] !== undefined && map[key] < currentQ.options.length) {
          e.preventDefault();
          handleAnswerSingleChoice(currentQ.id, map[key]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, playerSession, currentQ, currentIndex, deck.length, userAnswers, handleNext, handlePrev, handleAnswerSingleChoice]);

  // Loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-sm font-semibold text-slate-700">Đang khởi tạo hệ thống Quiz & Bảo mật...</div>
      </div>
    );
  }

  // ================= ADMIN ROUTING =================
  if (mode === 'admin') {
    if (!adminUser) {
      return (
        <AdminLogin
          onSuccess={(admin) => setAdminUser(admin)}
          onBackToPlayer={() => handleSwitchMode('player')}
        />
      );
    }
    return (
      <AdminLayout
        admin={adminUser}
        onLogout={() => setAdminUser(null)}
        onExitToQuiz={() => handleSwitchMode('player')}
      />
    );
  }

  // ================= GUEST ROUTING (Needs Key) =================
  if (!playerSession) {
    return (
      <div className="relative">
        {modeNotification && (
          <div className="fixed top-0 inset-x-0 z-50 bg-slate-900 border-b border-slate-700 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 max-w-md mx-auto w-full justify-between">
              <span className="font-semibold">{modeNotification}</span>
              <button
                onClick={() => setModeNotification(null)}
                className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
        <KeyActivationScreen
          initialKey={preloadedKey}
          onKeyChange={setPreloadedKey}
          onActivationSuccess={(sess: any) => setPlayerSession(sess)}
          onAdminClick={() => handleSwitchMode('admin')}
        />
      </div>
    );
  }

  // ================= AUTHENTICATED PLAYER QUIZ VIEW =================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Mode Notification Banner */}
      {modeNotification && (
        <div className="bg-slate-900 border-b border-slate-700 text-white text-xs px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
            <span className="font-semibold">{modeNotification}</span>
            <button
              onClick={() => setModeNotification(null)}
              className="px-2 py-0.5 rounded text-[11px] bg-white/10 hover:bg-white/20 font-bold cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Facebook In-App Browser Notice */}
      <FacebookBrowserNotice
        currentKey={playerSession?.key}
        hasActiveSession={true}
      />

      {/* 1. Player Key & Time Countdown TopBar */}
      <PlayerTopBar
        session={playerSession}
        onKeyExpired={() => {
          removePlayerToken();
          setPlayerSession(null);
        }}
        onOpenAdmin={() => handleSwitchMode('admin')}
        onExitSession={() => {
          removePlayerToken();
          setPlayerSession(null);
        }}
      />

      {/* 2. Header with Topic selector, score counters, Shuffle, Reset, and Submit Exam button */}
      <Header
        currentIndex={currentIndex}
        totalCards={deck.length}
        correctCount={summary.correctCount}
        wrongCount={summary.wrongCount}
        selectedTopic={selectedTopic}
        onSelectTopic={setSelectedTopic}
        onShuffle={handleShuffle}
        onReset={() => setIsResetConfirmOpen(true)}
        onToggleDrawer={() => setIsDrawerOpen(true)}
        onSubmit={() => setIsSubmitConfirmOpen(true)}
      />

      {/* 3. Main Flashcard Question Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center justify-center">
        {currentQ ? (
          <Flashcard
            question={currentQ}
            cardIndex={currentIndex}
            totalCards={deck.length}
            userAnswers={userAnswers}
            onAnswerSingleChoice={handleAnswerSingleChoice}
            onAnswerTrueFalse={handleAnswerTrueFalse}
            onAnswerShortAnswer={handleAnswerShortAnswer}
            isBookmarked={!!bookmarks[currentQ.id]}
            onToggleBookmark={handleToggleBookmark}
            onNext={handleNext}
            onPrev={handlePrev}
            canNext={currentIndex < deck.length - 1}
            canPrev={currentIndex > 0}
          />
        ) : (
          <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
            <p className="text-slate-500">Không có câu hỏi trong bộ lọc này.</p>
            <button
              onClick={() => setSelectedTopic('all')}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Xem tất cả chủ đề
            </button>
          </div>
        )}

        {/* Minimal shortcuts hint */}
        <div className="mt-3 text-center text-[11px] text-slate-400 hidden sm:flex items-center justify-center gap-4">
          <span>Phím tắt:</span>
          <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">A / B / C / D</span>
          <span>chọn đáp án</span>
          <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">Space / Enter</span>
          <span>thẻ tiếp theo</span>
          <span className="bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 font-mono">← / →</span>
          <span>chuyển thẻ</span>
        </div>
      </main>

      {/* 4. Card Deck Drawer */}
      <CardDeckDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        questions={deck}
        currentIndex={currentIndex}
        onSelectCard={setCurrentIndex}
        userAnswers={userAnswers}
        bookmarks={bookmarks}
        onStudyMistakes={summary.wrongCount > 0 ? handleStudyMistakesOnly : undefined}
        wrongCount={summary.wrongCount}
      />

      {/* 5. Confirmation Modal for Resetting Progress */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Làm lại từ đầu?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tất cả câu trả lời và số điểm hiện tại sẽ được đặt lại để bạn luyện tập lại từ thẻ số 1.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReset}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Đồng ý làm lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Confirmation Modal for Submitting Official Quiz */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Nộp bài thi chính thức?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hệ thống máy chủ sẽ tự động tính điểm theo thang 10 và lưu kết quả vào hồ sơ học sinh của bạn.
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 flex justify-between">
                <span>Số câu đã trả lời:</span>
                <strong className="text-blue-600">
                  {summary.correctCount + summary.wrongCount} / {deck.length} câu
                </strong>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsSubmitConfirmOpen(false)}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Tiếp tục làm
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Official Results Modal with Score & Answers Review */}
      <PlayerResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        result={submittedResult}
        studentName={playerSession?.studentName}
        onRetry={() => {
          setIsResultModalOpen(false);
          handleConfirmReset();
        }}
      />
    </div>
  );
}
