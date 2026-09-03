import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trophy, Network, Zap, RefreshCw } from 'lucide-react';
import KnockoutTree from '../components/KnockoutTree';

export default function Standings() {
    const [tournament, setTournament] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('group');
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('fc27_user');
        if (!userData) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);

        const docRef = doc(db, 'tournaments', parsedUser.roomCode);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setTournament(docSnap.data());
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    if (!tournament || !currentUser) return null;

    const isLeagueComplete = tournament.matches?.length > 0 && tournament.matches.every(m => m.status === 'completed');

    const calculateStandings = () => {
        const standingsMap = {};

        tournament.players?.forEach(player => {
            player.teams?.forEach(team => {
                standingsMap[team] = {
                    team: team,
                    owner: player.name,
                    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0
                };
            });
        });

        tournament.matches?.forEach(match => {
            if (match.status === 'completed' && standingsMap[match.home] && standingsMap[match.away]) {
                const home = standingsMap[match.home];
                const away = standingsMap[match.away];
                const hScore = match.homeScore;
                const aScore = match.awayScore;

                home.p += 1; away.p += 1;
                home.gf += hScore; away.gf += aScore;
                home.ga += aScore; away.ga += hScore;

                if (hScore > aScore) {
                    home.w += 1; home.pts += 3;
                    away.l += 1;
                } else if (hScore < aScore) {
                    away.w += 1; away.pts += 3;
                    home.l += 1;
                } else {
                    home.d += 1; away.d += 1;
                    home.pts += 1; away.pts += 1;
                }

                home.gd = home.gf - home.ga;
                away.gd = away.gf - away.ga;
            }
        });

        let sortedStandings = Object.values(standingsMap).sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            if (b.gf !== a.gf) return b.gf - a.gf;
            return a.team.localeCompare(b.team);
        });

        sortedStandings = sortedStandings.map((team, index) => {
            const rank = index + 1;
            let zone = 'normal';

            if (tournament.mode === 'ucl') {
                if (rank <= 8) zone = 'champion';
                else if (rank <= 24) zone = 'ucl';
                else zone = 'relegation';
            } else {
                if (rank <= 4) zone = 'champion';
                else if (rank <= 6) zone = 'ucl';
                else if (rank >= 18) zone = 'relegation';
            }

            return { ...team, rank, zone };
        });

        return sortedStandings;
    };

    const standings = calculateStandings();

    const createTeamObj = (name, owner) => ({ name, owner, leg1: null, leg2: null, agg: null, score: null });

    const handleGenerateKnockouts = async () => {
        let hasProgress = false;
        if (tournament.knockouts) {
            Object.values(tournament.knockouts).forEach(round => {
                round.forEach(m => {
                    if (
                        (m.status && m.status !== 'upcoming') ||
                        (m.readyManagers && m.readyManagers.length > 0) ||
                        m.scoreProposal
                    ) {
                        hasProgress = true;
                    }
                });
            });
        }

        if (hasProgress) {
            const confirmReset = window.confirm("⚠️ DANGER: Knockout matches have already started! Syncing now will WIPE OUT all current scores and progress. Are you absolutely sure you want to HARD RESET?");
            if (!confirmReset) return;
        } else if (!isLeagueComplete) {
            if (!window.confirm("League Phase is NOT finished. Generate a LIVE PREVIEW bracket? (Matches will be locked in Match Hub)")) return;
        } else {
            if (!window.confirm("League Phase is complete! Generate the FINAL OFFICIAL Bracket?")) return;
        }

        const top8 = standings.slice(0, 8);
        const playoffsTeams = standings.slice(8, 24);

        const playoffs = [];
        for (let i = 0; i < 8; i++) {
            playoffs.push({
                id: `po-${i + 1}`,
                teamA: createTeamObj(playoffsTeams[i]?.team || 'TBD', playoffsTeams[i]?.owner || 'TBD'),
                teamB: createTeamObj(playoffsTeams[15 - i]?.team || 'TBD', playoffsTeams[15 - i]?.owner || 'TBD'),
                status: 'upcoming',
                winner: null
            });
        }

        const r16 = [];
        for (let i = 0; i < 8; i++) {
            r16.push({
                id: `r16-${i + 1}`,
                teamA: createTeamObj(top8[i]?.team || 'TBD', top8[i]?.owner || 'TBD'),
                teamB: createTeamObj(`Winner PO-${i + 1}`, 'TBD'),
                status: 'upcoming',
                winner: null
            });
        }

        const qf = Array.from({ length: 4 }).map((_, i) => ({
            id: `qf-${i + 1}`, teamA: createTeamObj(`Winner R16-${i * 2 + 1}`, 'TBD'), teamB: createTeamObj(`Winner R16-${i * 2 + 2}`, 'TBD'), status: 'upcoming', winner: null
        }));

        const sf = Array.from({ length: 2 }).map((_, i) => ({
            id: `sf-${i + 1}`, teamA: createTeamObj(`Winner QF-${i * 2 + 1}`, 'TBD'), teamB: createTeamObj(`Winner QF-${i * 2 + 2}`, 'TBD'), status: 'upcoming', winner: null
        }));

        const final = [{
            id: 'final', teamA: createTeamObj('Winner SF-1', 'TBD'), teamB: createTeamObj('Winner SF-2', 'TBD'), status: 'upcoming', winner: null
        }];

        const knockoutsData = { playoffs, r16, qf, sf, final };

        try {
            const docRef = doc(db, 'tournaments', tournament.code);
            await updateDoc(docRef, { knockouts: knockoutsData });
        } catch (error) {
            alert("Failed to generate bracket: " + error.message);
        }
    };

    const getZoneStyle = (zone) => {
        switch (zone) {
            case 'champion': return 'border-l-4 border-amber-400 bg-amber-50/40';
            case 'ucl': return 'border-l-4 border-emerald-500 bg-emerald-50/30';
            case 'relegation': return 'border-l-4 border-rose-500 bg-rose-50/30';
            default: return 'border-l-4 border-transparent';
        }
    };

    const formatGD = (gd) => (gd > 0 ? `+${gd}` : gd);

    return (
        <div className="p-4 bg-slate-50 min-h-screen pb-24">
            <div className="mb-5 mt-2">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Trophy className="text-amber-500 mr-2" size={24} />
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Standings</h2>
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-1 rounded-md tracking-widest">
                        {tournament.mode === 'ucl' ? 'UCL Format' : 'EPL Format'}
                    </span>
                </div>

                {currentUser.isHost && (
                    <button onClick={handleGenerateKnockouts} className="w-full mb-4 bg-slate-800 text-white hover:bg-slate-700 transition-colors font-bold text-xs py-3 rounded-xl uppercase tracking-widest flex items-center justify-center shadow-lg active:scale-95">
                        <RefreshCw size={14} className="mr-2" />
                        {isLeagueComplete ? 'Regenerate Final Bracket' : 'Sync Live Bracket'}
                    </button>
                )}

                {tournament.mode === 'ucl' && (
                    <div className="flex bg-slate-200/60 p-1 rounded-xl">
                        <button onClick={() => setViewMode('group')} className={`flex-1 flex items-center justify-center py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${viewMode === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            League Phase
                        </button>
                        <button onClick={() => setViewMode('knockout')} className={`flex-1 flex items-center justify-center py-2.5 text-xs uppercase tracking-wider font-bold rounded-lg transition-all ${viewMode === 'knockout' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Network size={14} className="mr-1.5" /> Knockout Tree
                        </button>
                    </div>
                )}
            </div>

            {viewMode === 'knockout' && tournament.mode === 'ucl' ? (
                <div className="animate-in fade-in">
                    {tournament.knockouts ? (
                        <>
                            {!isLeagueComplete && (
                                <div className="text-center text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 py-2 px-4 rounded-lg uppercase tracking-wider mb-4">
                                    Live Preview Mode • Matches Locked in Hub
                                </div>
                            )}
                            <KnockoutTree />
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl shadow-sm border border-slate-100 mt-4 animate-in fade-in">
                            <div className="bg-slate-50 p-4 rounded-full mb-4">
                                <Network size={40} className="text-slate-400" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Bracket Not Generated</h3>
                            <p className="text-sm text-slate-500 text-center mb-8 font-medium px-4">
                                Host needs to click Sync Live Bracket to draw matches.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in">
                    <div className="w-[210px] flex-shrink-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white">
                        <div className="flex text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-3 border-b border-slate-100">
                            <div className="w-5 text-center">#</div>
                            <div className="flex-1 ml-2">Club</div>
                            <div className="w-8 text-center text-blue-600">Pts</div>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {standings.map((team) => {
                                // HIGHLIGHT MÀU VÀNG NẾU LÀ ĐỘI CỦA MÌNH
                                const isMe = team.owner === currentUser.name;
                                return (
                                    <div key={team.rank} className={`flex items-center p-3 h-14 ${getZoneStyle(team.zone)}`}>
                                        <div className="w-5 text-center font-bold text-slate-400 text-xs">{team.rank}</div>
                                        <div className="flex-1 ml-2 truncate pr-1">
                                            <div className={`text-[13px] truncate ${isMe ? 'text-amber-600 font-black' : 'text-slate-800 font-bold'}`}>{team.team}</div>
                                            <div className={`text-[9px] uppercase truncate ${isMe ? 'text-amber-500 font-black' : 'text-slate-400 font-bold'}`}>{team.owner}</div>
                                        </div>
                                        <div className="w-8 text-center font-black text-blue-600 text-[15px]">{team.pts}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex-1 overflow-x-auto scrollbar-hide">
                        <div className="flex text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 p-3 border-b border-slate-100 min-w-[240px]">
                            <div className="w-8 text-center">P</div>
                            <div className="w-8 text-center">W</div>
                            <div className="w-8 text-center">D</div>
                            <div className="w-8 text-center">L</div>
                            <div className="w-8 text-center">GF</div>
                            <div className="w-8 text-center">GA</div>
                            <div className="w-10 text-center">GD</div>
                        </div>
                        <div className="divide-y divide-slate-50 min-w-[240px]">
                            {standings.map((team) => (
                                <div key={team.rank} className={`flex items-center p-3 h-14 transition-colors ${getZoneStyle(team.zone).replace('border-l-4', '')}`}>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.p}</div>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.w}</div>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.d}</div>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.l}</div>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.gf}</div>
                                    <div className="w-8 text-center font-semibold text-slate-600 text-[13px]">{team.ga}</div>
                                    <div className="w-10 text-center font-bold text-slate-800 text-[13px]">{formatGD(team.gd)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}