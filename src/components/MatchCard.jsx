import { Check, Clock, Edit2 } from 'lucide-react';

export default function MatchCard({ match, type, onReady, onScoreInput }) {
    // type có thể là: 'upcoming', 'my-match', 'result'

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-2.5 mb-2">
            {/* Header (Trạng thái trận đấu) */}
            <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-slate-50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Matchday {match.matchday || 1}
                </span>

                {type === 'result' ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        FT
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md flex items-center">
                        <Clock size={10} className="mr-1" /> Scheduled
                    </span>
                )}
            </div>

            {/* Tên Đội bóng & Tỉ số */}
            <div className="flex items-center justify-between mb-1.5">
                {/* Đội Nhà */}
                <div className="flex-1 text-center overflow-hidden">
                    <div className="font-bold text-slate-800 text-[13px] truncate leading-tight">
                        {match.home}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">Player A</div>
                </div>

                {/* Khu vực giữa (Tỉ số hoặc chữ VS) */}
                <div className="px-2 text-center flex flex-col items-center justify-center shrink-0">
                    {type === 'result' ? (
                        <div className="text-lg font-black text-slate-800 tracking-tighter">
                            {match.homeScore} - {match.awayScore}
                        </div>
                    ) : (
                        <div className="text-xs font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            VS
                        </div>
                    )}
                </div>

                {/* Đội Khách */}
                <div className="flex-1 text-center overflow-hidden">
                    <div className="font-bold text-slate-800 text-[13px] truncate leading-tight">
                        {match.away}
                    </div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">Player B</div>
                </div>
            </div>

            {/* Khu vực nút bấm (Chỉ hiển thị ở tab My Matches) */}
            {type === 'my-match' && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-50">
                    <button
                        onClick={onReady}
                        className="flex-1 bg-blue-50 text-blue-600 font-semibold py-1.5 rounded-lg text-xs flex items-center justify-center hover:bg-blue-100 transition-colors active:scale-95"
                    >
                        <Check size={14} className="mr-1" /> Ready
                    </button>
                    <button
                        onClick={onScoreInput}
                        className="flex-1 bg-slate-800 text-white font-semibold py-1.5 rounded-lg text-xs flex items-center justify-center hover:bg-slate-700 transition-colors active:scale-95"
                    >
                        <Edit2 size={14} className="mr-1" /> Enter Score
                    </button>
                </div>
            )}
        </div>
    );
}