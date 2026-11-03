import React, { useEffect, useState } from 'react';
import { adminFetch } from '../../services/api';
import { Trophy, Medal, Award, Flame, Users, Clock } from 'lucide-react';

export const AdminLeaderboard: React.FC = () => {
  const [data, setData] = useState<any>({ topScores: [], topAttempts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await adminFetch('/admin/leaderboard');
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Bảng Xếp Hạng & Vinh Danh (Leaderboard)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Top thí sinh đạt điểm cao nhất và các thí sinh tích cực luyện tập nhất
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Scores */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span>Top Thí Sinh Điểm Cao Nhất</span>
          </div>

          <div className="space-y-2.5">
            {data.topScores.map((item: any, idx: number) => {
              let medalIcon = <span className="font-bold text-xs text-slate-400">#{idx + 1}</span>;
              if (idx === 0) medalIcon = <Medal className="w-5 h-5 text-amber-500" />;
              if (idx === 1) medalIcon = <Medal className="w-5 h-5 text-slate-400" />;
              if (idx === 2) medalIcon = <Medal className="w-5 h-5 text-amber-700" />;

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 flex items-center justify-center shrink-0">
                      {medalIcon}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{item.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Key: {item.key}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-emerald-700 text-sm">{item.score} / 10</div>
                    <div className="text-[10px] text-slate-400">
                      {Math.floor(item.timeSpentSeconds / 60)}m {item.timeSpentSeconds % 60}s
                    </div>
                  </div>
                </div>
              );
            })}

            {data.topScores.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400">Chưa có bài thi nào được nộp.</div>
            )}
          </div>
        </div>

        {/* Top Attempts */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
            <Flame className="w-5 h-5 text-orange-500" />
            <span>Top Thí Sinh Chăm Chỉ (Lượt Làm Nhiều Nhất)</span>
          </div>

          <div className="space-y-2.5">
            {data.topAttempts.map((u: any, idx: number) => (
              <div
                key={u.id}
                className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 flex items-center justify-center font-bold text-xs text-slate-400">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Key: {u.key}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-blue-700">{u.totalAttempts} lượt làm</div>
                  <div className="text-[10px] text-slate-400">Điểm cao nhất: {u.highestScore || 0}đ</div>
                </div>
              </div>
            ))}

            {data.topAttempts.length === 0 && (
              <div className="text-center py-10 text-xs text-slate-400">Chưa có dữ liệu người chơi.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
