import { Check, Clock, Edit2 } from 'lucide-react';

export default function MatchCard({ match, type, onReady, onScoreInput }) {
    // type có thể là: 'upcoming', 'my-match', 'result'

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            {/* Header (Trạng thái trận đấu) */}
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Matchday {match.matchday || 1}
                </span>

                {type === 'result' ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                        FT
                    </span>
                ) : (
                    <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-md flex items-center">
                        <Clock size={12} className="mr-1" /> Scheduled
                    </span>
                )}
            </div>

            {/* Tên Đội bóng & Tỉ số */}
            <div className="flex items-center justify-between mb-4">
                {/* Đội Nhà */}
                <div className="flex-1 text-center">
                    <div className="font-bold text-slate-800 text-[17px] truncate leading-tight mb-1">
                        {match.home}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Player A</div>
                </div>

                {/* Khu vực giữa (Tỉ số hoặc chữ VS) */}
                <div className="px-4 text-center flex flex-col items-center justify-center">
                    {type === 'result' ? (
                        <div className="text-2xl font-black text-slate-800 tracking-tighter">
                            {match.homeScore} - {match.awayScore}
                        </div>
                    ) : (
                        <div className="text-sm font-bold text-slate-300 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                            VS
                        </div>
                    )}
                </div>

                {/* Đội Khách */}
                <div className="flex-1 text-center">
                    <div className="font-bold text-slate-800 text-[17px] truncate leading-tight mb-1">
                        {match.away}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">Player B</div>
                </div>
            </div>

            {/* Khu vực nút bấm (Chỉ hiển thị ở tab My Matches) */}
            {type === 'my-match' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                    <button
                        onClick={onReady}
                        className="flex-1 bg-blue-50 text-blue-600 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95"
                    >
                        <Check size={16} className="mr-1.5" /> Ready
                    </button>
                    <button
                        onClick={onScoreInput}
                        className="flex-1 bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center hover:bg-slate-700 transition-colors active:scale-95"
                    >
                        <Edit2 size={16} className="mr-1.5" /> Enter Score
                    </button>
                </div>
            )}
        </div>
    );
}