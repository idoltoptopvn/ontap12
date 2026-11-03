import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import { BookOpen, Settings, Check, Clock, Award, Shuffle, Eye, Layers } from 'lucide-react';

export const AdminQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editQuiz, setEditQuiz] = useState<any | null>(null);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/admin/quizzes');
      setQuizzes(res.quizzes || []);
      setTotalQuestions(res.totalQuestions || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuiz) return;
    try {
      await adminFetch('/admin/quizzes/update', {
        method: 'POST',
        body: JSON.stringify({
          id: editQuiz.id,
          updates: {
            title: editQuiz.title,
            durationMinutes: editQuiz.durationMinutes,
            maxAttempts: editQuiz.maxAttempts,
            allowViewAnswers: editQuiz.allowViewAnswers,
            allowViewExplanation: editQuiz.allowViewExplanation,
            practiceModeEnabled: editQuiz.practiceModeEnabled,
            examModeEnabled: editQuiz.examModeEnabled,
            shuffleQuestions: editQuiz.shuffleQuestions,
            passingScore: editQuiz.passingScore,
            isActive: editQuiz.isActive,
          },
        }),
      });
      alert('Cập nhật cấu hình bài thi thành công!');
      setEditQuiz(null);
      fetchQuizzes();
    } catch (err: any) {
      alert(err.message || 'Cập nhật thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Quản Lý Bài Thi & Đề Cương (Quiz Management)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý ngân hàng câu hỏi, thiết lập thời gian thi, số lần làm bài và quyền xem lời giải
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{q.title}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {totalQuestions || q.totalQuestions} Câu hỏi
                </span>
                {q.isActive ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đang mở
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Tạm khóa
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{q.description}</p>

              {/* Badges Info */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Thời gian thi: <strong>{q.durationMinutes} phút</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>Điểm đạt: <strong>{q.passingScore}/10</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tối đa: <strong>{q.maxAttempts} lần</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditQuiz({ ...q })}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Settings className="w-4 h-4" />
              <span>Cấu Hình Bài Thi</span>
            </button>
          </div>
        ))}
      </div>

      {/* EDIT QUIZ MODAL */}
      {editQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base">Cấu Hình Đề Thi</h3>
            <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề bài thi:</label>
                <input
                  type="text"
                  value={editQuiz.title}
                  onChange={(e) => setEditQuiz({ ...editQuiz, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thời gian làm bài (Phút):</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={editQuiz.durationMinutes}
                    onChange={(e) => setEditQuiz({ ...editQuiz, durationMinutes: parseInt(e.target.value, 10) || 45 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Điểm đạt (trên 10):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={editQuiz.passingScore}
                    onChange={(e) => setEditQuiz({ ...editQuiz, passingScore: parseFloat(e.target.value) || 5.0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 font-semibold">Trạng thái mở bài thi:</span>
                  <input
                    type="checkbox"
                    checked={editQuiz.isActive}
                    onChange={(e) => setEditQuiz({ ...editQuiz, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 font-semibold">Cho phép xem đáp án đúng:</span>
                  <input
                    type="checkbox"
                    checked={editQuiz.allowViewAnswers}
                    onChange={(e) => setEditQuiz({ ...editQuiz, allowViewAnswers: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 font-semibold">Cho phép xem lời giải chi tiết:</span>
                  <input
                    type="checkbox"
                    checked={editQuiz.allowViewExplanation}
                    onChange={(e) => setEditQuiz({ ...editQuiz, allowViewExplanation: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 font-semibold">Bật chế độ Luyện tập:</span>
                  <input
                    type="checkbox"
                    checked={editQuiz.practiceModeEnabled}
                    onChange={(e) => setEditQuiz({ ...editQuiz, practiceModeEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-800 font-semibold">Bật chế độ Thi thử:</span>
                  <input
                    type="checkbox"
                    checked={editQuiz.examModeEnabled}
                    onChange={(e) => setEditQuiz({ ...editQuiz, examModeEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditQuiz(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm cursor-pointer"
                >
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
