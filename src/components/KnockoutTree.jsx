import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trophy, Medal, PartyPopper, List, GitMerge } from 'lucide-react';

export default function KnockoutTree() {
    const [displayMode, setDisplayMode] = useState('list');
    const [activeRound, setActiveRound] = useState('playoffs');
    const [tournament, setTournament] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('fc27_user');
        if (!userData) return;

        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);

        const docRef = doc(db, 'tournaments', parsedUser.roomCode);

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setTournament(docSnap.data());
            }
        });

        return () => unsubscribe();
    }, []);

    const rounds = [
        { id: 'playoffs', label: 'Play-offs' },
        { id: 'r16', label: 'R16' },
        { id: 'qf', label: 'Quarters' },
        { id: 'sf', label: 'Semis' },
        { id: 'final', label: 'Final' }
    ];

    const currentMatches = tournament?.knockouts?.[activeRound] || [];

    // HÀM RENDER BOX CỦA SƠ ĐỒ CÂY
    const renderBracketMatch = (match, rightLine = false, isFinal = false, isPlayoff = false) => {
        if (!match) return null;
        const isCompleted = match.status === 'completed';
        const winnerA = match.winner === 'teamA';
        const winnerB = match.winner === 'teamB';
        const hasWinner = isCompleted && match.winner;

        // KIỂM TRA ĐỘI CỦA MÌNH
        const isMeA = match.teamA?.owner === currentUser?.name;
        const isMeB = match.teamB?.owner === currentUser?.name;

        return (
            <div className="relative flex items-center justify-center w-[130px]">
                {rightLine && (
                    <div className={`absolute top-1/2 -translate-y-1/2 z-0 h-[2px] left-full transition-all duration-500 ${isPlayoff ? 'w-8' : 'w-4'
                        } ${hasWinner ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] z-20' : 'bg-slate-700'}`}></div>
                )}

                <div className={`w-[130px] h-[62px] bg-slate-900 border rounded-md shadow-sm shrink-0 z-10 flex flex-col overflow-hidden transition-all duration-500 ${hasWinner ? 'border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.15)]' : 'border-slate-700'}`}>
                    <div className={`flex justify-between items-center px-1.5 py-1.5 border-b border-slate-800 h-1/2 ${winnerA ? 'bg-blue-900/50' : ''}`}>
                        <div className="truncate pr-1 w-[100px]">
                            {/* ĐÃ SỬA: Đội bóng chỉ tô màu vàng khi thắng */}
                            <div className={`text-[10px] truncate ${winnerA ? 'text-amber-400 font-bold' : 'text-slate-300 font-bold'}`}>{match.teamA?.name || 'TBD'}</div>
                            {/* ĐÃ SỬA: Tên User được tô vàng nếu là đội của mình */}
                            <div className={`text-[7.5px] uppercase leading-none mt-[2px] truncate ${isMeA ? 'text-amber-500 font-black' : 'text-slate-500 font-bold'}`}>{match.teamA?.owner || '-'}</div>
                        </div>
                        <div className={`text-[11px] font-black w-5 text-right ${winnerA ? 'text-amber-400' : 'text-slate-500'}`}>
                            {isCompleted ? (isFinal ? match.teamA.score : (match.teamA.agg ?? match.teamA.score)) : '-'}
                        </div>
                    </div>
                    <div className={`flex justify-between items-center px-1.5 py-1.5 h-1/2 ${winnerB ? 'bg-blue-900/50' : ''}`}>
                        <div className="truncate pr-1 w-[100px]">
                            {/* ĐÃ SỬA: Đội bóng chỉ tô màu vàng khi thắng */}
                            <div className={`text-[10px] truncate ${winnerB ? 'text-amber-400 font-bold' : 'text-slate-300 font-bold'}`}>{match.teamB?.name || 'TBD'}</div>
                            {/* ĐÃ SỬA: Tên User được tô vàng nếu là đội của mình */}
                            <div className={`text-[7.5px] uppercase leading-none mt-[2px] truncate ${isMeB ? 'text-amber-500 font-black' : 'text-slate-500 font-bold'}`}>{match.teamB?.owner || '-'}</div>
                        </div>
                        <div className={`text-[11px] font-black w-5 text-right ${winnerB ? 'text-amber-400' : 'text-slate-500'}`}>
                            {isCompleted ? (isFinal ? match.teamB.score : (match.teamB.agg ?? match.teamB.score)) : '-'}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMatchPair = (topMatch, bottomMatch, index) => {
        const topWinner = topMatch?.status === 'completed' && topMatch?.winner;
        const bottomWinner = bottomMatch?.status === 'completed' && bottomMatch?.winner;
        const anyWinner = topWinner || bottomWinner;

        return (
            <div key={index} className="flex-1 flex flex-col relative">
                <div className="flex-1 flex flex-col justify-center relative">
                    {renderBracketMatch(topMatch, true, false, false)}
                </div>
                <div className="flex-1 flex flex-col justify-center relative">
                    {renderBracketMatch(bottomMatch, true, false, false)}
                </div>

                <div className={`absolute top-[25%] bottom-[50%] left-[calc(100%+16px)] w-[2px] transition-all duration-500 z-0 ${topWinner ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-700'}`} />
                <div className={`absolute top-[50%] bottom-[25%] left-[calc(100%+16px)] w-[2px] transition-all duration-500 z-0 ${bottomWinner ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-700'}`} />
                <div className={`absolute top-[50%] -translate-y-1/2 left-[calc(100%+16px)] w-4 h-[2px] transition-all duration-500 z-0 ${anyWinner ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-slate-700'}`} />
            </div>
        );
    };

    return (
        <div className="mt-2 animate-in fade-in">
            <div className="flex bg-slate-200/60 p-1 rounded-xl mb-4 max-w-[240px] mx-auto">
                <button onClick={() => setDisplayMode('list')} className={`flex-1 flex items-center justify-center py-2 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${displayMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List size={12} className="mr-1.5" /> List View
                </button>
                <button onClick={() => setDisplayMode('bracket')} className={`flex-1 flex items-center justify-center py-2 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-all ${displayMode === 'bracket' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <GitMerge size={12} className="mr-1.5" /> Bracket
                </button>
            </div>

            {displayMode === 'list' && (
                <div className="animate-in fade-in slide-in-from-left-2">
                    <div className="flex justify-between mb-4 bg-white rounded-xl shadow-sm border border-slate-100 p-1">
                        {rounds.map((round) => (
                            <button
                                key={round.id}
                                onClick={() => setActiveRound(round.id)}
                                className={`flex-1 text-center py-2.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${activeRound === round.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                {round.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {currentMatches.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 font-medium bg-white rounded-xl border border-slate-100 border-dashed">
                                <div className="text-[10px] uppercase font-bold tracking-widest opacity-70">Awaiting League Phase Completion</div>
                            </div>
                        ) : (
                            currentMatches.map((match, index) => {
                                const isFinal = activeRound === 'final';
                                const isFinalFinished = isFinal && match.status === 'completed' && match.winner;
                                const championTeam = isFinalFinished ? match[match.winner] : null;

                                const isMeA = match.teamA?.owner === currentUser?.name;
                                const isMeB = match.teamB?.owner === currentUser?.name;

                                return (
                                    <div key={match.id || index}>
                                        {isFinalFinished && (
                                            <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl p-6 mb-6 shadow-xl shadow-amber-200/50 text-center relative overflow-hidden animate-in zoom-in duration-500">
                                                <div className="absolute top-0 right-0 p-4 opacity-20"><Trophy size={80} /></div>
                                                <div className="absolute bottom-0 left-0 p-2 opacity-20"><PartyPopper size={60} /></div>
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm">
                                                        <Trophy size={40} className="text-white drop-shadow-md" />
                                                    </div>
                                                    <h3 className="text-amber-50 font-bold uppercase tracking-widest text-xs mb-1">Tournament Champion</h3>
                                                    <h2 className="text-3xl font-black text-white drop-shadow-md mb-1">{championTeam.name}</h2>
                                                    <div className="flex items-center text-amber-100 font-medium text-sm bg-black/10 px-3 py-1 rounded-full">
                                                        <Medal size={14} className="mr-1.5" />
                                                        Manager: {championTeam.owner}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden relative">
                                            <div className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider px-4 py-2 border-b border-slate-100 flex items-center">
                                                <div className="flex-1 flex items-center gap-2 text-slate-400">
                                                    <span>{isFinal ? 'Grand Final' : `Match #${index + 1}`}</span>
                                                    <span className={match.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}>
                                                        • {match.status === 'completed' ? 'Finished' : 'Upcoming'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 justify-end w-[120px]">
                                                    {isFinal ? (
                                                        <div className="w-16 text-center text-slate-400">SCORE</div>
                                                    ) : (
                                                        <>
                                                            <div className="w-9 text-center text-blue-500/80">LEG 1</div>
                                                            <div className="w-9 text-center text-amber-500/80">LEG 2</div>
                                                            <div className="w-10 text-center text-slate-400">AGG</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-0">
                                                <div className={`flex items-center px-4 py-3 border-b border-slate-50 ${match.winner === 'teamA' ? 'bg-blue-50/30' : ''}`}>
                                                    <div className="flex-1 truncate">
                                                        {/* ĐÃ SỬA Ở DẠNG LIST: Màu đội bóng dựa trên kết quả trận đấu */}
                                                        <div className={`text-sm truncate ${match.winner === 'teamA' ? 'text-blue-700 font-bold' : 'text-slate-800 font-bold'}`}>{match.teamA.name}</div>
                                                        {/* ĐÃ SỬA Ở DẠNG LIST: Tô màu vàng cho tên User */}
                                                        <div className={`text-[10px] uppercase ${isMeA ? 'text-amber-500 font-black' : 'text-slate-400 font-bold'}`}>{match.teamA.owner}</div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2 w-[120px]">
                                                        {isFinal ? (
                                                            <div className={`w-16 text-center font-black text-2xl ${match.winner === 'teamA' ? 'text-blue-600' : 'text-slate-700'}`}>{match.teamA.score ?? '-'}</div>
                                                        ) : (
                                                            <>
                                                                <div className="w-9 h-7 flex items-center justify-center bg-blue-50 text-blue-600 font-bold rounded-md text-xs border border-blue-100/50">{match.teamA.leg1 ?? '-'}</div>
                                                                <div className="w-9 h-7 flex items-center justify-center bg-amber-50 text-amber-600 font-bold rounded-md text-xs border border-amber-100/50">{match.teamA.leg2 ?? '-'}</div>
                                                                <div className={`w-10 text-center font-black text-lg ${match.winner === 'teamA' ? 'text-blue-600' : 'text-slate-700'}`}>{match.teamA.agg ?? '-'}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={`flex items-center px-4 py-3 ${match.winner === 'teamB' ? 'bg-blue-50/30' : ''}`}>
                                                    <div className="flex-1 truncate">
                                                        {/* ĐÃ SỬA Ở DẠNG LIST: Màu đội bóng dựa trên kết quả trận đấu */}
                                                        <div className={`text-sm truncate ${match.winner === 'teamB' ? 'text-blue-700 font-bold' : 'text-slate-800 font-bold'}`}>{match.teamB.name}</div>
                                                        {/* ĐÃ SỬA Ở DẠNG LIST: Tô màu vàng cho tên User */}
                                                        <div className={`text-[10px] uppercase ${isMeB ? 'text-amber-500 font-black' : 'text-slate-400 font-bold'}`}>{match.teamB.owner}</div>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-2 w-[120px]">
                                                        {isFinal ? (
                                                            <div className={`w-16 text-center font-black text-2xl ${match.winner === 'teamB' ? 'text-blue-600' : 'text-slate-700'}`}>{match.teamB.score ?? '-'}</div>
                                                        ) : (
                                                            <>
                                                                <div className="w-9 h-7 flex items-center justify-center bg-blue-50 text-blue-600 font-bold rounded-md text-xs border border-blue-100/50">{match.teamB.leg1 ?? '-'}</div>
                                                                <div className="w-9 h-7 flex items-center justify-center bg-amber-50 text-amber-600 font-bold rounded-md text-xs border border-amber-100/50">{match.teamB.leg2 ?? '-'}</div>
                                                                <div className={`w-10 text-center font-black text-lg ${match.winner === 'teamB' ? 'text-blue-600' : 'text-slate-700'}`}>{match.teamB.agg ?? '-'}</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {displayMode === 'bracket' && (
                <div className="animate-in fade-in slide-in-from-right-2 bg-[#080d19] rounded-2xl p-4 overflow-x-auto shadow-inner border border-slate-800">
                    {!tournament.knockouts ? (
                        <div className="text-center py-10 text-slate-500 font-medium text-xs uppercase tracking-widest">
                            Bracket not generated yet
                        </div>
                    ) : (
                        <div className="flex gap-8 min-w-max py-6 items-stretch pr-8 h-[760px]">

                            {/* Cột 1: Play-offs */}
                            <div className="flex flex-col h-full w-[130px] relative">
                                <div className="text-[9px] text-slate-500 font-black uppercase text-center absolute -top-5 w-full tracking-widest">Play-offs</div>
                                {tournament.knockouts.playoffs?.map((m, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-center relative">
                                        {renderBracketMatch(m, true, false, true)}
                                    </div>
                                ))}
                            </div>

                            {/* Cột 2: R16 */}
                            <div className="flex flex-col h-full w-[130px] relative">
                                <div className="text-[9px] text-slate-500 font-black uppercase text-center absolute -top-5 w-full tracking-widest">Round of 16</div>
                                {Array.from({ length: 4 }).map((_, i) => renderMatchPair(tournament.knockouts.r16[i * 2], tournament.knockouts.r16[i * 2 + 1], i))}
                            </div>

                            {/* Cột 3: Quarters */}
                            <div className="flex flex-col h-full w-[130px] relative">
                                <div className="text-[9px] text-slate-500 font-black uppercase text-center absolute -top-5 w-full tracking-widest">Quarters</div>
                                {Array.from({ length: 2 }).map((_, i) => renderMatchPair(tournament.knockouts.qf[i * 2], tournament.knockouts.qf[i * 2 + 1], i))}
                            </div>

                            {/* Cột 4: Semis */}
                            <div className="flex flex-col h-full w-[130px] relative">
                                <div className="text-[9px] text-slate-500 font-black uppercase text-center absolute -top-5 w-full tracking-widest">Semis</div>
                                {renderMatchPair(tournament.knockouts.sf[0], tournament.knockouts.sf[1], 0)}
                            </div>

                            {/* Cột 5: Chung Kết */}
                            <div className="flex flex-col h-full w-[130px] relative pl-2">
                                <div className="text-[9px] text-amber-500 font-black uppercase text-center absolute -top-5 w-full tracking-widest">Grand Final</div>
                                <div className="flex-1 flex flex-col justify-center relative">
                                    <div className="scale-110 shadow-amber-500/20 shadow-xl relative z-10">
                                        <div className="absolute -top-3 -right-2 text-amber-400 z-20"><Trophy size={18} fill="currentColor" /></div>
                                        {renderBracketMatch(tournament.knockouts.final[0], false, true, false)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}