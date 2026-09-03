import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Users, Crown, Play, Copy, CheckCircle2, Star, Shield } from 'lucide-react';
import { startTournament } from '../services/drawAlgorithm';

export default function Dashboard() {
    const [tournament, setTournament] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [isStarting, setIsStarting] = useState(false);
    const [copied, setCopied] = useState(false); // Trạng thái copy mã Code
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const userData = localStorage.getItem('fc27_user');
            if (!userData) {
                navigate('/');
                return;
            }

            const parsedUser = JSON.parse(userData);
            setCurrentUser(parsedUser);

            const docRef = doc(db, 'tournaments', parsedUser.roomCode);
            const unsubscribe = onSnapshot(
                docRef,
                (docSnap) => {
                    if (docSnap.exists()) {
                        setTournament(docSnap.data());
                    } else {
                        setErrorMsg("Tournament not found or deleted.");
                    }
                },
                (error) => {
                    console.error("Firebase Snapshot Error:", error);
                    setErrorMsg("Database Connection Error: " + error.message);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("Initialization Error:", err);
            setErrorMsg("Failed to load user data: " + err.message);
        }
    }, [navigate]);

    const handleStartTournament = async () => {
        if (!tournament || !currentUser?.isHost) return;
        setIsStarting(true);

        try {
            await startTournament(tournament.code, tournament.mode, tournament.players);
        } catch (error) {
            alert("Error starting tournament: " + error.message);
            setIsStarting(false);
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(tournament.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (errorMsg) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in">
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 text-center w-full shadow-sm">
                    <div className="font-black text-xl mb-2 tracking-tight">Oops! Something went wrong</div>
                    <div className="text-sm font-medium opacity-80">{errorMsg}</div>
                </div>
            </div>
        );
    }

    if (!tournament || !currentUser) {
        return (
            <div className="flex flex-col justify-center items-center h-[70vh] animate-in fade-in">
                <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4 shadow-lg shadow-blue-200"></div>
                <div className="text-slate-400 font-bold tracking-widest text-xs uppercase animate-pulse">Establishing Connection...</div>
            </div>
        );
    }

    // ==========================================
    // TRẠNG THÁI 1: WAITING LOBBY (PHÒNG CHỜ)
    // ==========================================
    if (tournament.status === 'waiting') {
        return (
            <div className="p-4 bg-slate-50 min-h-screen">
                {/* Room Code Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 mb-4 text-center animate-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Room Code</h2>

                    <button
                        onClick={handleCopyCode}
                        className="group relative inline-flex items-center justify-center transition-all active:scale-95"
                    >
                        <div className="text-5xl font-black text-slate-800 tracking-[0.2em] group-hover:text-blue-600 transition-colors">
                            {tournament.code}
                        </div>
                        <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-blue-500 transition-colors">
                            {copied ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Copy size={24} />}
                        </div>
                    </button>

                    <p className="text-slate-500 text-xs font-bold mt-4 tracking-wide">
                        {copied ? 'COPIED TO CLIPBOARD!' : 'TAP CODE TO COPY & SHARE'}
                    </p>
                </div>

                {/* Managers List Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-5 px-1">
                        <h3 className="font-black text-slate-800 flex items-center text-lg tracking-tight">
                            <Users className="mr-2 text-blue-500" size={22} />
                            Managers
                            <span className="ml-2 text-sm text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                {tournament.players.length}/{tournament.mode === 'premier_league' ? 4 : 4}
                            </span>
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {tournament.players.map((player) => (
                            <div key={player.id} className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 transition-all hover:bg-slate-50">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-11 h-11 rounded-xl shadow-sm flex items-center justify-center font-black text-lg text-white ${player.isHost ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <span className="font-black text-slate-800 block text-sm mb-0.5">{player.name}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                                            <Shield size={10} className="mr-1" /> {player.favoriteTeam}
                                        </span>
                                    </div>
                                </div>
                                {player.isHost ? (
                                    <span className="flex items-center text-[10px] uppercase font-black text-amber-700 bg-amber-100 px-2.5 py-1.5 rounded-lg tracking-wider">
                                        <Crown size={12} className="mr-1" /> HOST
                                    </span>
                                ) : (
                                    <span className="text-[10px] uppercase font-black text-emerald-700 bg-emerald-100 px-2.5 py-1.5 rounded-lg tracking-wider">
                                        READY
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {currentUser.isHost ? (
                        <button
                            onClick={handleStartTournament}
                            disabled={tournament.players.length < 2 || isStarting}
                            className="w-full mt-6 bg-slate-900 text-white font-black uppercase text-sm tracking-widest py-4 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isStarting ? (
                                <div className="animate-spin w-5 h-5 border-2 border-slate-400 border-t-white rounded-full mr-3"></div>
                            ) : (
                                <Play size={18} className="mr-2" fill="currentColor" />
                            )}
                            {isStarting ? 'Initiating Draft...' : 'Start Draft'}
                        </button>
                    ) : (
                        <div className="mt-6 text-center py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold flex items-center justify-center text-xs uppercase tracking-widest text-slate-400">
                            <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full mr-2"></div>
                            Waiting for Host...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // TRẠNG THÁI 2: GAME ON (ĐÃ CHIA BẢNG)
    // ==========================================
    return (
        <div className="p-4 mt-4 animate-in zoom-in duration-500 pb-24 bg-slate-50 min-h-screen">
            <div className="text-center mb-8 bg-white py-6 rounded-[2rem] shadow-sm border border-slate-100">
                <h2 className="text-4xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-1">
                    Game On!
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Draft phase completed. Squads locked.
                </p>
            </div>

            <div className="space-y-4">
                <div className="px-2 flex justify-between items-end mb-2">
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">Squad Overviews</h3>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase tracking-widest">
                        Official Results
                    </span>
                </div>

                {tournament.players.map(p => (
                    <div key={p.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md">
                        <div className="bg-slate-900 px-5 py-3.5 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                                    {p.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-black text-white tracking-wide">{p.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {p.teams?.length || 0} Teams
                            </span>
                        </div>

                        <div className="p-2">
                            {p.teams?.map((team, idx) => {
                                const isFirstPick = team === p.favoriteTeam;
                                return (
                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl mb-1 last:mb-0 transition-colors ${isFirstPick ? 'bg-blue-50/50 border border-blue-100/50' : 'hover:bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${isFirstPick ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-300'}`}></div>
                                            <span className={`text-sm ${isFirstPick ? 'font-black text-blue-700' : 'font-bold text-slate-600'}`}>
                                                {team}
                                            </span>
                                        </div>
                                        {isFirstPick && (
                                            <span className="flex items-center text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-wider">
                                                <Star size={10} className="mr-1" fill="currentColor" /> First Pick
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}