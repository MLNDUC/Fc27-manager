import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Swords, X, Handshake, ChevronDown, Zap, Edit, Trophy, Lock, CheckCircle2 } from 'lucide-react';

export default function MyMatches() {
    const navigate = useNavigate();

    // Khởi tạo currentUser trực tiếp thay vì thông qua useEffect
    const [currentUser] = useState(() => {
        const userData = localStorage.getItem('fc27_user');
        return userData ? JSON.parse(userData) : null;
    });

    const [tournament, setTournament] = useState(null);
    const [activeMatch, setActiveMatch] = useState(null);
    const [activeLeg, setActiveLeg] = useState(1);
    const [scoreInput, setScoreInput] = useState({
        leg1Home: '', leg1Away: '',
        leg2Home: '', leg2Away: '',
        home: '', away: ''
    });
    const [activeInput, setActiveInput] = useState('home');
    const [filterTab, setFilterTab] = useState('ALL');

    useEffect(() => {
        if (!currentUser) {
            navigate('/');
            return;
        }

        const docRef = doc(db, 'tournaments', currentUser.roomCode);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setTournament(docSnap.data());
            }
        });

        return () => unsubscribe();
    }, [navigate, currentUser]);

    // Sử dụng useMemo để ngăn chặn việc tính toán lại danh sách các đối thủ trong mỗi lần render
    const opponents = useMemo(() => {
        if (!tournament || !currentUser) return [];
        return tournament.players.map(p => p.name).filter(name => name !== currentUser.name);
    }, [tournament, currentUser]);

    // Tính toán quyền sở hữu đội bóng, phân tích trận đấu và sắp xếp, được bọc trong một useMemo
    const processedMatches = useMemo(() => {
        if (!tournament || !currentUser) return [];

        const teamOwners = {};
        tournament.players.forEach(p => {
            p.teams.forEach(t => teamOwners[t] = p.name);
        });

        // 1. GOM TOÀN BỘ TRẬN ĐẤU CHO MỌI USER (Không cần check isHost nữa)
        let myMatchesRaw = tournament.matches?.map(m => ({ ...m, isLeague: true })) || [];

        if (tournament.knockouts) {
            Object.entries(tournament.knockouts).forEach(([round, matches]) => {
                matches.forEach((m, idx) => {
                    if (m.teamA?.name && m.teamB?.name && m.teamA?.name !== 'TBD' && m.teamB?.name !== 'TBD' && !m.teamA?.name.includes('Winner') && !m.teamB?.name.includes('Winner')) {
                         // Đưa tất cả trận KO hợp lệ vào danh sách tổng
                        myMatchesRaw.push({
                            ...m,
                            isKnockout: true,
                            koRound: round,
                            koIndex: idx,
                            home: m.teamA.name,
                            away: m.teamB.name,
                            homeScore: m.teamA.score,
                            awayScore: m.teamB.score,
                        });
                    }
                });
            });
        }

        // 2. LỌC DỮ LIỆU THEO TỪNG TAB
        const filteredMatches = myMatchesRaw.filter(match => {
            if (filterTab === 'ALL') return true; // Tab ALL: Ai cũng thấy được toàn bộ giải đấu
            if (filterTab === 'COMPLETED') return match.status === 'completed'; // Thêm lọc cho tab COMPLETED
            if (filterTab === 'KNOCKOUT') return match.isKnockout;

            const homeOwner = match.isKnockout ? match.teamA.owner : teamOwners[match.home];
            const awayOwner = match.isKnockout ? match.teamB.owner : teamOwners[match.away];

            if (filterTab === 'INTERNAL') return homeOwner === awayOwner;

            // TAB "vs [ĐỐI THỦ]": Chỉ hiện trận đối đầu trực tiếp giữa MÌNH và ĐỐI THỦ
            const isMyMatch = homeOwner === currentUser.name || awayOwner === currentUser.name;
            const isOpponentMatch = homeOwner === filterTab || awayOwner === filterTab;
            
            return isMyMatch && isOpponentMatch && (homeOwner !== awayOwner);
        });

        // 3. SẮP XẾP ƯU TIÊN
        return [...filteredMatches].sort((a, b) => {
            const isCompletedA = a.status === 'completed';
            const isCompletedB = b.status === 'completed';
            if (isCompletedA !== isCompletedB) return isCompletedA ? 1 : -1;

            const getRoundWeight = (match) => {
                if (!match.isKnockout) return 0;
                const order = { 'playoffs': 1, 'r16': 2, 'qf': 3, 'sf': 4, 'final': 5 };
                return order[match.koRound] || 99;
            };
            const roundA = getRoundWeight(a);
            const roundB = getRoundWeight(b);
            if (roundA !== roundB) return roundA - roundB;

            const getPriority = (match) => {
                const homeOwner = match.isKnockout ? match.teamA.owner : teamOwners[match.home];
                const awayOwner = match.isKnockout ? match.teamB.owner : teamOwners[match.away];
                const isMyMatch = homeOwner === currentUser.name || awayOwner === currentUser.name;

                // Nếu xem tab ALL, đẩy các trận của NGƯỜI KHÁC xuống dưới cùng (Ưu tiên 5)
                // Các trận CỦA MÌNH sẽ luôn nổi lên trên cho dễ tìm
                if (!isMyMatch) return 5;

                const opponentName = homeOwner === currentUser.name ? awayOwner : homeOwner;
                const isMeReady = match.readyManagers?.includes(currentUser.name);
                const isOpponentReady = match.readyManagers?.includes(opponentName);
                const hasPing = isOpponentReady && !isMeReady;
                const hasProposal = match.scoreProposal !== undefined;

                if (hasPing || (isMeReady && isOpponentReady) || hasProposal) return 1;
                if (homeOwner === awayOwner) return 2;
                if (match.status === 'leg1_completed') return 3;
                return 4;
            };

            return getPriority(a) - getPriority(b);
        });
    }, [tournament, currentUser, filterTab]);

    if (!tournament || !currentUser) return null;

    const isLeagueComplete = tournament.matches?.length > 0 && tournament.matches.every(m => m.status === 'completed');
    
    // Tái tạo lại teamOwners cục bộ cho logic render (nếu cần thiết sau bước useMemo)
    const teamOwners = {};
    tournament.players.forEach(p => {
        p.teams.forEach(t => teamOwners[t] = p.name);
    });

    const advanceKnockoutWinner = (knockouts, round, index, winnerObj) => {
        const nextRoundMap = {
            'playoffs': { next: 'r16', getIndex: i => i, isTeamB: true },
            'r16': { next: 'qf', getIndex: i => Math.floor(i / 2), isTeamB: i => i % 2 !== 0 },
            'qf': { next: 'sf', getIndex: i => Math.floor(i / 2), isTeamB: i => i % 2 !== 0 },
            'sf': { next: 'final', getIndex: () => 0, isTeamB: i => i % 2 !== 0 },
            'final': null
        };

        const rule = nextRoundMap[round];
        if (rule && knockouts[rule.next]) {
            const nextMatch = knockouts[rule.next][rule.getIndex(index)];
            const isB = typeof rule.isTeamB === 'function' ? rule.isTeamB(index) : rule.isTeamB;
            if (isB) {
                nextMatch.teamB = { name: winnerObj.name, owner: winnerObj.owner };
            } else {
                nextMatch.teamA = { name: winnerObj.name, owner: winnerObj.owner };
            }
        }
    };

    const updateDB = async (updates) => {
        const docRef = doc(db, 'tournaments', tournament.code);
        await updateDoc(docRef, updates);
    };

    const handleReadyPing = async (match) => {
        const currentReady = match.readyManagers || [];
        if (currentReady.includes(currentUser.name)) return;
        const newReady = [...currentReady, currentUser.name];

        if (match.isKnockout) {
            const newKOs = { ...tournament.knockouts };
            newKOs[match.koRound][match.koIndex].readyManagers = newReady;
            await updateDB({ knockouts: newKOs });
        } else {
            const newMatches = [...tournament.matches];
            const idx = newMatches.findIndex(m => m.home === match.home && m.away === match.away);
            newMatches[idx].readyManagers = newReady;
            await updateDB({ matches: newMatches });
        }
    };

    const submitScoreProposal = async () => {
        let isHostForce = activeMatch.isHostOverride;

        if (activeMatch.isKnockout && activeMatch.koRound !== 'final') {
            const l1H = scoreInput.leg1Home; const l1A = scoreInput.leg1Away;
            const l2H = scoreInput.leg2Home; const l2A = scoreInput.leg2Away;

            if (l1H === '' || l1A === '') return alert("Please enter at least the Leg 1 scores!");

            const newKOs = { ...tournament.knockouts };
            const koMatch = newKOs[activeMatch.koRound][activeMatch.koIndex];
            const h1 = parseInt(l1H); const a1 = parseInt(l1A);
            const h2 = (l2H !== '' && l2A !== '') ? parseInt(l2H) : null;
            const a2 = (l2H !== '' && l2A !== '') ? parseInt(l2A) : null;

            if (h2 !== null && a2 !== null) {
                const aggA = h1 + h2; const aggB = a1 + a2;
                if (aggA === aggB) return alert("Aggregate score is TIED! Please adjust LEG 2 score to include Extra Time or Penalties to determine the winner.");
            }

            if (isHostForce) {
                if (h2 !== null && a2 !== null) {
                    koMatch.teamA.leg1 = h1; koMatch.teamB.leg1 = a1;
                    koMatch.teamA.leg2 = h2; koMatch.teamB.leg2 = a2;
                    koMatch.teamA.agg = h1 + h2; koMatch.teamB.agg = a1 + a2;
                    koMatch.status = 'completed';
                    koMatch.winner = (h1 + h2) > (a1 + a2) ? 'teamA' : 'teamB';
                    delete koMatch.scoreProposal;
                    advanceKnockoutWinner(newKOs, activeMatch.koRound, activeMatch.koIndex, koMatch[koMatch.winner]);
                } else {
                    koMatch.teamA.leg1 = h1; koMatch.teamB.leg1 = a1;
                    koMatch.status = 'leg1_completed';
                    delete koMatch.scoreProposal;
                }
            } else {
                koMatch.scoreProposal = {
                    leg1Home: h1, leg1Away: a1,
                    leg2Home: h2, leg2Away: a2,
                    submittedBy: currentUser.name
                };
            }
            await updateDB({ knockouts: newKOs });

        } else {
            if (scoreInput.home === '' || scoreInput.away === '') return alert("Please enter both scores!");
            const hScore = parseInt(scoreInput.home); const aScore = parseInt(scoreInput.away);

            if (activeMatch.isKnockout) {
                if (hScore === aScore) return alert("Final matches cannot end in a draw! Include Extra Time/Pens.");
                const newKOs = { ...tournament.knockouts };
                const koMatch = newKOs[activeMatch.koRound][activeMatch.koIndex];

                if (isHostForce) {
                    koMatch.teamA.score = hScore; koMatch.teamB.score = aScore;
                    koMatch.status = 'completed';
                    koMatch.winner = hScore > aScore ? 'teamA' : 'teamB';
                    delete koMatch.scoreProposal;
                    advanceKnockoutWinner(newKOs, activeMatch.koRound, activeMatch.koIndex, koMatch[koMatch.winner]);
                } else {
                    koMatch.scoreProposal = { home: hScore, away: aScore, submittedBy: currentUser.name };
                }
                await updateDB({ knockouts: newKOs });
            } else {
                const newMatches = [...tournament.matches];
                const idx = newMatches.findIndex(m => m.home === activeMatch.home && m.away === activeMatch.away);
                if (isHostForce) {
                    newMatches[idx].homeScore = hScore; newMatches[idx].awayScore = aScore; newMatches[idx].status = 'completed'; delete newMatches[idx].scoreProposal;
                } else {
                    newMatches[idx].scoreProposal = { home: hScore, away: aScore, submittedBy: currentUser.name };
                }
                await updateDB({ matches: newMatches });
            }
        }

        setActiveMatch(null);
    };

    const handleValidateScore = async (match, isAccepted) => {
        if (match.isKnockout) {
            const newKOs = { ...tournament.knockouts };
            const koMatch = newKOs[match.koRound][match.koIndex];

            if (isAccepted) {
                if (match.koRound !== 'final') {
                    const p = koMatch.scoreProposal;
                    if (p.leg2Home !== null && p.leg2Away !== null) {
                        koMatch.teamA.leg1 = p.leg1Home; koMatch.teamB.leg1 = p.leg1Away;
                        koMatch.teamA.leg2 = p.leg2Home; koMatch.teamB.leg2 = p.leg2Away;
                        const aggA = p.leg1Home + p.leg2Home;
                        const aggB = p.leg1Away + p.leg2Away;
                        koMatch.teamA.agg = aggA; koMatch.teamB.agg = aggB;
                        koMatch.status = 'completed';
                        koMatch.winner = aggA > aggB ? 'teamA' : 'teamB';
                        advanceKnockoutWinner(newKOs, match.koRound, match.koIndex, koMatch[koMatch.winner]);
                    } else {
                        koMatch.teamA.leg1 = p.leg1Home; koMatch.teamB.leg1 = p.leg1Away;
                        koMatch.status = 'leg1_completed';
                    }
                } else {
                    koMatch.teamA.score = koMatch.scoreProposal.home;
                    koMatch.teamB.score = koMatch.scoreProposal.away;
                    koMatch.status = 'completed';
                    koMatch.winner = koMatch.teamA.score > koMatch.teamB.score ? 'teamA' : 'teamB';
                    advanceKnockoutWinner(newKOs, match.koRound, match.koIndex, koMatch[koMatch.winner]);
                }
            }
            delete koMatch.scoreProposal;
            await updateDB({ knockouts: newKOs });
        } else {
            const newMatches = [...tournament.matches];
            const idx = newMatches.findIndex(m => m.home === match.home && m.away === match.away);
            if (isAccepted) {
                newMatches[idx].homeScore = newMatches[idx].scoreProposal.home;
                newMatches[idx].awayScore = newMatches[idx].scoreProposal.away;
                newMatches[idx].status = 'completed';
            }
            delete newMatches[idx].scoreProposal;
            await updateDB({ matches: newMatches });
        }
    };

    const handleInternalWin = async (match, winnerStr) => {
        if (match.isKnockout) {
            const newKOs = { ...tournament.knockouts };
            const koMatch = newKOs[match.koRound][match.koIndex];
            const isFinal = match.koRound === 'final';

            if (isFinal) {
                koMatch.teamA.score = winnerStr === 'home' ? 3 : 0;
                koMatch.teamB.score = winnerStr === 'away' ? 3 : 0;
            } else {
                koMatch.teamA.leg1 = winnerStr === 'home' ? 3 : 0;
                koMatch.teamB.leg1 = winnerStr === 'away' ? 3 : 0;
                koMatch.teamA.leg2 = 0;
                koMatch.teamB.leg2 = 0;
                koMatch.teamA.agg = winnerStr === 'home' ? 3 : 0;
                koMatch.teamB.agg = winnerStr === 'away' ? 3 : 0;
            }

            koMatch.status = 'completed';
            koMatch.winner = winnerStr === 'home' ? 'teamA' : 'teamB';
            advanceKnockoutWinner(newKOs, match.koRound, match.koIndex, koMatch[koMatch.winner]);
            await updateDB({ knockouts: newKOs });
        } else {
            const newMatches = [...tournament.matches];
            const idx = newMatches.findIndex(m => m.home === match.home && m.away === match.away);
            newMatches[idx].homeScore = winnerStr === 'home' ? 3 : 0;
            newMatches[idx].awayScore = winnerStr === 'away' ? 3 : 0;
            newMatches[idx].status = 'completed';
            await updateDB({ matches: newMatches });
        }
    };

    const handleOpenNumpad = (match, isHostForce = false) => {
        let currentLeg = 1;
        let s = { leg1Home: '', leg1Away: '', leg2Home: '', leg2Away: '', home: '', away: '' };

        if (match.isKnockout && match.koRound !== 'final') {
            s.leg1Home = match.teamA.leg1?.toString() ?? '';
            s.leg1Away = match.teamB.leg1?.toString() ?? '';
            s.leg2Home = match.teamA.leg2?.toString() ?? '';
            s.leg2Away = match.teamB.leg2?.toString() ?? '';
            if (match.status === 'leg1_completed') currentLeg = 2;
        } else {
            s.home = match.homeScore?.toString() ?? (match.isKnockout ? match.teamA.score?.toString() : '') ?? '';
            s.away = match.awayScore?.toString() ?? (match.isKnockout ? match.teamB.score?.toString() : '') ?? '';
        }

        setActiveMatch({ ...match, isHostOverride: isHostForce });
        setActiveLeg(currentLeg);
        setScoreInput(s);
        setActiveInput('home');
    };

    const getTargetField = () => {
        if (activeMatch?.isKnockout && activeMatch?.koRound !== 'final') {
            return `leg${activeLeg}${activeInput === 'home' ? 'Home' : 'Away'}`;
        }
        return activeInput;
    };

    const handleNumpadPress = (num) => {
        const field = getTargetField();
        if (scoreInput[field].length < 2) {
            setScoreInput(prev => ({ ...prev, [field]: prev[field] + num }));
        }
    };

    const handleNumpadDelete = () => {
        const field = getTargetField();
        setScoreInput(prev => ({ ...prev, [field]: prev[field].slice(0, -1) }));
    };

    const isKO2Leg = activeMatch?.isKnockout && activeMatch?.koRound !== 'final';
    const currentHomeVal = isKO2Leg ? scoreInput[`leg${activeLeg}Home`] : scoreInput.home;
    const currentAwayVal = isKO2Leg ? scoreInput[`leg${activeLeg}Away`] : scoreInput.away;

    let submitBtnText = 'Submit Score';
    let isDisableSubmit = false;

    if (isKO2Leg) {
        if (scoreInput.leg1Home !== '' && scoreInput.leg1Away !== '' && scoreInput.leg2Home !== '' && scoreInput.leg2Away !== '') {
            submitBtnText = 'Submit Both Legs';
        } else if (scoreInput.leg1Home !== '' && scoreInput.leg1Away !== '') {
            submitBtnText = 'Submit Leg 1';
        } else {
            submitBtnText = 'Enter Leg 1 to Submit';
            isDisableSubmit = true;
        }
    } else {
        if (scoreInput.home === '' || scoreInput.away === '') isDisableSubmit = true;
        if (activeMatch?.isHostOverride) submitBtnText = 'Force Overwrite';
    }

    return (
        <div className="p-4 mt-2 animate-in fade-in pb-24 h-screen overflow-y-auto bg-slate-50">
            <div className="mb-4 px-2">
                <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">Match Hub</h2>
                <p className="text-slate-500 text-sm font-medium">Head-to-head fixtures & Knockouts</p>
            </div>

            <div className="flex overflow-x-auto gap-2 px-2 pb-4 mb-2 scrollbar-hide">
                <button onClick={() => setFilterTab('ALL')} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${filterTab === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>All</button>
                
                {tournament.knockouts && (
                    <button onClick={() => setFilterTab('KNOCKOUT')} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center ${filterTab === 'KNOCKOUT' ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 border border-amber-200'}`}>
                        <Trophy size={14} className="mr-1.5" /> Knockouts
                    </button>
                )}
                
                {opponents.map(opp => (
                    <button key={opp} onClick={() => setFilterTab(opp)} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${filterTab === opp ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>vs {opp}</button>
                ))}

                <button onClick={() => setFilterTab('COMPLETED')} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center ${filterTab === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200'}`}>
                    <CheckCircle2 size={14} className="mr-1.5" /> Completed
                </button>

                <button onClick={() => setFilterTab('INTERNAL')} className={`whitespace-nowrap px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-sm ${filterTab === 'INTERNAL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Internal</button>
            </div>

            <div className="space-y-4">
                {processedMatches.map((match, idx) => {
                    const homeOwner = match.isKnockout ? match.teamA.owner : teamOwners[match.home];
                    const awayOwner = match.isKnockout ? match.teamB.owner : teamOwners[match.away];
                    const isCompleted = match.status === 'completed';
                    const isLeg1Done = match.status === 'leg1_completed';
                    const isInternal = homeOwner === awayOwner;
                    const isMyMatch = homeOwner === currentUser.name || awayOwner === currentUser.name;
                    const iAmHome = homeOwner === currentUser.name;
                    const iAmAway = awayOwner === currentUser.name;
                    const opponentName = iAmHome ? awayOwner : homeOwner;

                    const isMeReady = match.readyManagers?.includes(currentUser.name);
                    const isOpponentReady = match.readyManagers?.includes(opponentName);
                    const isBothReady = isMeReady && isOpponentReady;
                    const hasProposal = match.scoreProposal !== undefined;
                    const isPinged = isOpponentReady && !isMeReady && !isCompleted;

                    const isLockedKnockout = match.isKnockout && !isLeagueComplete;

                    return (
                        <div key={`${match.home}-${match.away}-${idx}`} className={`bg-white rounded-2xl shadow-sm border overflow-hidden relative transition-all duration-500 ${isPinged || (hasProposal && match.scoreProposal.submittedBy !== currentUser.name) ? 'border-rose-300 shadow-rose-100/50 scale-[1.02]' : 'border-slate-100'}`}>

                            {match.isKnockout && (
                                <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-br-xl z-10 flex items-center shadow-sm">
                                    <Trophy size={10} className="mr-1" /> {match.koRound.replace('r16', 'Round of 16').replace('qf', 'Quarter-Final').replace('sf', 'Semi-Final').replace('playoffs', 'Play-Off')}
                                </div>
                            )}

                            {currentUser.isHost && !isLockedKnockout && (
                                <button onClick={() => handleOpenNumpad(match, true)} className="absolute top-2 right-2 p-2 bg-slate-50 text-slate-400 hover:text-amber-600 rounded-full transition-colors z-10">
                                    <Edit size={16} />
                                </button>
                            )}

                            {isInternal && !isCompleted && !isLockedKnockout && (
                                <div className="bg-slate-100 text-slate-600 p-3 text-center text-xs font-black uppercase tracking-wider border-b border-slate-200 mt-6 flex items-center justify-center gap-2">
                                    <Handshake size={14} /> Internal Match
                                </div>
                            )}

                            <div className={`p-4 ${match.isKnockout ? 'pt-8' : 'pt-6'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    {/* HIGHLIGHT HOME TEAM CỦA USER ĐĂNG NHẬP */}
                                    <div className={`flex-1 text-right ${iAmHome ? 'text-amber-600 font-black' : 'font-bold text-slate-700'}`}>
                                        <div className={`text-[10px] uppercase mb-1 ${iAmHome ? 'text-amber-500 font-black' : 'text-slate-400 font-black'}`}>{homeOwner}</div>
                                        {match.home}
                                    </div>

                                    <div className="px-4 text-center relative">
                                        {isCompleted ? (
                                            <div className="text-2xl font-black text-slate-800 tracking-wider">
                                                {match.isKnockout && match.koRound !== 'final' ? `${match.teamA.agg} - ${match.teamB.agg}` : `${match.homeScore} - ${match.awayScore}`}
                                            </div>
                                        ) : isLeg1Done && !hasProposal ? (
                                            <div className="flex flex-col items-center">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">LEG 1</div>
                                                <div className="text-base font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                                                    {match.teamA.leg1} - {match.teamB.leg1}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                                                <Swords size={14} />
                                            </div>
                                        )}
                                    </div>

                                    {/* HIGHLIGHT AWAY TEAM CỦA USER ĐĂNG NHẬP */}
                                    <div className={`flex-1 text-left ${iAmAway ? 'text-amber-600 font-black' : 'font-bold text-slate-700'}`}>
                                        <div className={`text-[10px] uppercase mb-1 ${iAmAway ? 'text-amber-500 font-black' : 'text-slate-400 font-black'}`}>{awayOwner}</div>
                                        {match.away}
                                    </div>
                                </div>

                                {!isCompleted && (
                                    <div className="mt-4">
                                        {isLockedKnockout ? (
                                            <div className="w-full bg-slate-100 text-slate-400 font-bold py-3.5 rounded-xl uppercase tracking-wider text-[11px] flex items-center justify-center border border-slate-200">
                                                <Lock size={14} className="mr-2" /> Locked until League Ends
                                            </div>
                                        ) : isInternal ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => handleInternalWin(match, 'home')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-3 rounded-xl uppercase transition-colors">{match.home} 3-0</button>
                                                <button onClick={() => handleInternalWin(match, 'away')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black py-3 rounded-xl uppercase transition-colors">{match.away} 3-0</button>
                                            </div>
                                        ) : !isMyMatch ? (
                                            <div className="w-full bg-slate-50 border border-slate-100 text-slate-400 font-bold py-3 rounded-xl uppercase text-[11px] flex items-center justify-center tracking-wider">
                                                Waiting for {homeOwner} & {awayOwner}
                                            </div>
                                        ) : hasProposal ? (
                                            match.scoreProposal.submittedBy === currentUser.name ? (
                                                <div className="bg-blue-50 text-blue-600 text-center py-3 rounded-xl text-[11px] font-bold uppercase animate-pulse border border-blue-100 tracking-wider">
                                                    Waiting for {opponentName}...
                                                </div>
                                            ) : (
                                                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl">
                                                    <div className="text-center text-xs font-bold text-rose-500 mb-3 uppercase">
                                                        Verify: <span className="text-rose-700 font-black mx-1">
                                                            {match.isKnockout && match.koRound !== 'final'
                                                                ? `${match.scoreProposal.leg1Home}-${match.scoreProposal.leg1Away} ${match.scoreProposal.leg2Home !== null ? `| L2: ${match.scoreProposal.leg2Home}-${match.scoreProposal.leg2Away}` : '(L1)'}`
                                                                : `${match.scoreProposal.home} - ${match.scoreProposal.away}`}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleValidateScore(match, false)} className="flex-1 bg-white text-rose-600 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm">Reject</button>
                                                        <button onClick={() => handleValidateScore(match, true)} className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md">Confirm</button>
                                                    </div>
                                                </div>
                                            )
                                        ) : !isBothReady ? (
                                            <div className="flex flex-col gap-2">
                                                {!isMeReady ? (
                                                    <button onClick={() => handleReadyPing(match)} className={`relative w-full text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm shadow-lg flex items-center justify-center ${isPinged ? 'bg-rose-500 hover:bg-rose-600 animate-pulse' : 'bg-amber-500 hover:bg-amber-600'}`}>
                                                        {isPinged && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4"><span className="animate-ping absolute h-full w-full rounded-full bg-rose-300"></span><span className="relative rounded-full h-4 w-4 bg-rose-500"></span></span>}
                                                        <Zap size={16} className="mr-2" /> {isPinged ? 'Opponent waiting!' : `Ready for ${isLeg1Done ? 'LEG 2' : 'Match'}`}
                                                    </button>
                                                ) : (
                                                    <div className="w-full bg-slate-50 text-slate-400 font-bold py-3 rounded-xl uppercase text-xs flex items-center justify-center">Waiting for {opponentName}...</div>
                                                )}
                                            </div>
                                        ) : (
                                            <button onClick={() => handleOpenNumpad(match, false)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl uppercase tracking-wider text-sm shadow-lg hover:bg-blue-700">
                                                Enter Score {match.isKnockout && match.koRound !== 'final' ? (isLeg1Done ? '(LEG 2)' : '(LEG 1)') : ''}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* BOTTOM SHEET NUMPAD */}
            {activeMatch && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-t-3xl shadow-2xl p-5 pb-24 animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex justify-between items-center mb-1">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Record Score</h3>
                                {activeMatch.isHostOverride && <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md mt-1 inline-block">Host Override</span>}
                            </div>
                            <button onClick={() => setActiveMatch(null)} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><ChevronDown size={18} /></button>
                        </div>

                        {isKO2Leg && (
                            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 mt-3">
                                <button onClick={() => { setActiveLeg(1); setActiveInput('home'); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeLeg === 1 ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Leg 1</button>
                                <button onClick={() => { setActiveLeg(2); setActiveInput('home'); }} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeLeg === 2 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400'}`}>Leg 2</button>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-4 px-2 mt-4">
                            <div onClick={() => setActiveInput('home')} className={`flex-1 text-center p-3 rounded-2xl border-2 transition-all ${activeInput === 'home' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 truncate">{activeMatch.home}</div>
                                <div className="text-3xl font-black text-slate-800">{currentHomeVal || (currentHomeVal === '0' ? '0' : '-')}</div>
                            </div>
                            <div className="px-3 font-black text-slate-300 text-xl">:</div>
                            <div onClick={() => setActiveInput('away')} className={`flex-1 text-center p-3 rounded-2xl border-2 transition-all ${activeInput === 'away' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 truncate">{activeMatch.away}</div>
                                <div className="text-3xl font-black text-slate-800">{currentAwayVal || (currentAwayVal === '0' ? '0' : '-')}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button key={num} onClick={() => handleNumpadPress(num.toString())} className="bg-slate-50 active:bg-slate-200 border border-slate-100 py-4 rounded-xl text-lg font-black text-slate-700">{num}</button>
                            ))}
                            <button onClick={() => setActiveInput(activeInput === 'home' ? 'away' : 'home')} className="bg-slate-100 text-slate-500 font-bold uppercase text-[10px] rounded-xl">Switch</button>
                            <button onClick={() => handleNumpadPress('0')} className="bg-slate-50 active:bg-slate-200 border border-slate-100 py-4 rounded-xl text-lg font-black text-slate-700">0</button>
                            <button onClick={handleNumpadDelete} className="bg-rose-50 text-rose-500 font-bold uppercase text-[10px] rounded-xl flex items-center justify-center"><X size={18} /></button>
                        </div>

                        <button onClick={submitScoreProposal} disabled={isDisableSubmit} className={`w-full text-white font-black text-base py-4 rounded-2xl uppercase tracking-wider disabled:opacity-50 transition-colors ${activeMatch.isHostOverride ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                            {submitBtnText}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}