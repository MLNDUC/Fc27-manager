import { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, ArrowRight, Users, LogIn, Crown, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../services/tournamentService';
import { collection, doc, getDocs, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import teamsData from '../data/teams.json';

// Gộp chung tất cả các đội từ EPL và C1 lại, loại bỏ trùng lặp và sắp xếp A-Z
const allTeams = [
    ...Object.values(teamsData.epl_teams).flat(),
    ...Object.values(teamsData.c1_teams).flat()
];
const FAVORITE_TEAMS = [...new Set(allTeams)].sort((a, b) => a.localeCompare(b));

// Component hiển thị Thẻ Giải Đấu
function LeagueCard({ league, onJoinClick }) {
    const maxPlayers = league.mode === 'premier_league' ? 4 : 4;
    const currentPlayersCount = league.players ? league.players.length : 0;
    
    const isFull = currentPlayersCount >= maxPlayers;
    const isStarted = league.status !== 'waiting';

    // Tìm tên Chủ phòng (Host)
    const hostName = league.players?.find(p => p.isHost)?.name || league.players?.[0]?.name || 'Unknown';

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3.5 mb-3 flex items-center justify-between hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex-1 pr-3">
                {/* Header: Room Code & Status Badge */}
                <div className="flex items-center gap-2 mb-2">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="font-bold text-slate-800 text-sm tracking-wider">
                        {league.code || league.id}
                    </span>
                    
                    {isStarted ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase tracking-wider flex items-center">
                            <PlayCircle size={10} className="mr-1" /> In Progress
                        </span>
                    ) : isFull ? (
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[9px] font-bold rounded uppercase tracking-wider">
                            Full
                        </span>
                    ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded uppercase tracking-wider">
                            Open
                        </span>
                    )}
                </div>
                
                {/* Format & Host */}
                <div className="text-[10px] text-slate-500 mb-2 font-medium flex items-center gap-2 uppercase tracking-wide">
                    <span>
                        {league.mode === 'premier_league' ? 'Premier League' : 'UCL'}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center text-slate-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        <Crown size={10} className="text-amber-500 mr-1" /> {hostName}
                    </span>
                </div>

                {/* Players List & Capacity */}
                <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-slate-50">
                    <Users size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1 items-center">
                        {league.players && league.players.map((player, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {player.name}
                            </span>
                        ))}
                        <span className="text-[10px] text-slate-400 font-semibold ml-1">
                            ({currentPlayersCount}/{maxPlayers})
                        </span>
                    </div>
                </div>
            </div>

            {/* Action Button - Luôn mở để cho phép người chơi cũ Re-join */}
            <button
                onClick={() => onJoinClick(league.code || league.id)}
                className="shrink-0 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center transition-all active:scale-95 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200"
            >
                <LogIn size={14} className="mr-1.5" /> Join
            </button>
        </div>
    );
}

export default function Home() {
    const [playerName, setPlayerName] = useState('');
    const [favoriteTeam, setFavoriteTeam] = useState(FAVORITE_TEAMS[0] || 'Arsenal');
    const [activeTab, setActiveTab] = useState('create'); // 'create', 'join', 'lobbies'
    const [selectedMode, setSelectedMode] = useState('premier_league');
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [availableLeagues, setAvailableLeagues] = useState([]);
    const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);

    const navigate = useNavigate();

    // Fetch danh sách phòng khi chuyển sang tab Lobbies
    useEffect(() => {
        const fetchLeagues = async () => {
            if (activeTab === 'lobbies') {
                setIsLoadingLeagues(true);
                try {
                    const querySnapshot = await getDocs(collection(db, "tournaments"));
                    const leaguesData = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Ưu tiên hiển thị các phòng waiting lên đầu
                    leaguesData.sort((a, b) => {
                        if (a.status === 'waiting' && b.status !== 'waiting') return -1;
                        if (a.status !== 'waiting' && b.status === 'waiting') return 1;
                        return 0;
                    });
                    
                    setAvailableLeagues(leaguesData);
                } catch (error) {
                    console.error("Lỗi lấy danh sách giải đấu:", error);
                } finally {
                    setIsLoadingLeagues(false);
                }
            }
        };
        fetchLeagues();
    }, [activeTab]);

    const handleCreateTournament = async () => {
        if (!playerName.trim()) return alert("Please enter your name!");
        setIsLoading(true);
        try {
            const roomCode = await createTournament(playerName, selectedMode, favoriteTeam);
            localStorage.setItem('fc27_user', JSON.stringify({ name: playerName, isHost: true, roomCode: roomCode }));
            navigate('/dashboard');
        } catch (error) {
            alert("Failed to create tournament.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinTournament = async (e, directCode = null) => {
        if (e && e.preventDefault) e.preventDefault();
        
        const targetCode = directCode || joinCode;

        if (!targetCode.trim() || !playerName.trim()) {
            alert("Please enter your Manager Name then select a room to join the league.");
            return;
        }

        if (targetCode.trim().length !== 6) {
            alert("Valid 6-digit code required!");
            return;
        }

        setIsLoading(true);
        try {
            const docRef = doc(db, 'tournaments', targetCode.toUpperCase());
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Tournament not found! Please check the code.");
                setIsLoading(false);
                return;
            }

            const tournament = docSnap.data();

            // Kiểm tra xem người chơi đã tồn tại chưa
            const existingPlayer = tournament.players?.find(
                p => p.name.toLowerCase() === playerName.trim().toLowerCase()
            );

            // NẾU LÀ NGƯỜI CHƠI CŨ (RE-JOIN)
            if (existingPlayer) {
                const userData = {
                    ...existingPlayer,
                    roomCode: tournament.code
                };
                localStorage.setItem('fc27_user', JSON.stringify(userData));
                navigate('/dashboard');
                return;
            }

            // NẾU LÀ NGƯỜI CHƠI MỚI
            if (!favoriteTeam) {
                alert("New players must select a First Pick team!");
                setIsLoading(false);
                return;
            }

            // Người mới thì mới bị check lỗi Phòng Đã Bắt Đầu hoặc Đã Đầy
            if (tournament.status !== 'waiting') {
                alert("Tournament has already started! You cannot join as a new player.");
                setIsLoading(false);
                return;
            }

            const maxPlayers = tournament.mode === 'premier_league' ? 4 : 4;
            if (tournament.players?.length >= maxPlayers) {
                alert("Tournament is already full!");
                setIsLoading(false);
                return;
            }

            const newPlayer = {
                id: `player_${Date.now()}`,
                name: playerName.trim(),
                favoriteTeam: favoriteTeam,
                isHost: false,
                teams: []
            };

            await updateDoc(docRef, {
                players: arrayUnion(newPlayer)
            });

            localStorage.setItem('fc27_user', JSON.stringify({
                ...newPlayer,
                roomCode: tournament.code
            }));

            navigate('/dashboard');

        } catch (error) {
            console.error("Error joining tournament:", error);
            alert("Failed to join tournament: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[55%] bg-slate-900 rounded-b-[100%] shadow-2xl z-0"></div>

            <div className="relative z-10 flex-1 px-6 pt-16 pb-8 flex flex-col justify-center max-w-lg mx-auto w-full">
                <div className="text-center mb-8 mt-4">
                    <div className="bg-white/10 p-4 rounded-full inline-block mb-3 backdrop-blur-sm border border-white/20">
                        <Trophy size={40} className="text-amber-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-1">FC27 Manager</h1>
                    <p className="text-slate-400 font-medium text-sm">Road to Champion</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-6 flex-1 flex flex-col">
                    
                    {/* KHU VỰC NHẬP TÊN (CỐ ĐỊNH) */}
                    <div className="p-5 border-b-4 border-slate-50 bg-white">
                        <div className="mb-4">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Your Manager Name</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Pep Guardiola" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-sm" />
                        </div>
                        
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">First Pick (Favorite Team)</label>
                            <select
                                value={favoriteTeam}
                                onChange={(e) => setFavoriteTeam(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
                            >
                                {FAVORITE_TEAMS.map(teamName => (
                                    <option key={teamName} value={teamName}>{teamName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* TABS MENU */}
                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                        <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 font-bold text-xs transition-colors ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:bg-slate-50'}`}>Create</button>
                        <button onClick={() => setActiveTab('join')} className={`flex-1 py-3 font-bold text-xs transition-colors ${activeTab === 'join' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:bg-slate-50'}`}>Join with Code</button>
                        <button onClick={() => setActiveTab('lobbies')} className={`flex-1 py-3 font-bold text-xs transition-colors ${activeTab === 'lobbies' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-slate-400 hover:bg-slate-50'}`}>Lobbies</button>
                    </div>

                    {/* NỘI DUNG TABS */}
                    <div className="p-5 overflow-y-auto max-h-[40vh] custom-scrollbar">
                        
                        {/* TAB: CREATE */}
                        {activeTab === 'create' && (
                            <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Format</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div onClick={() => setSelectedMode('premier_league')} className={`relative border-2 rounded-xl p-3 cursor-pointer transition-all ${selectedMode === 'premier_league' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                            {selectedMode === 'premier_league' && <CheckCircle2 size={16} className="absolute top-2 right-2 text-blue-500" />}
                                            <div className="font-bold text-slate-800 text-sm mb-0.5">Premier League</div>
                                            <div className="text-[10px] font-semibold text-slate-400">20 Teams • 4 Players</div>
                                        </div>
                                        <div onClick={() => setSelectedMode('ucl')} className={`relative border-2 rounded-xl p-3 cursor-pointer transition-all ${selectedMode === 'ucl' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                            {selectedMode === 'ucl' && <CheckCircle2 size={16} className="absolute top-2 right-2 text-blue-500" />}
                                            <div className="font-bold text-slate-800 text-sm mb-0.5">UCL</div>
                                            <div className="text-[10px] font-semibold text-slate-400">36 Teams • 4 Players</div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleCreateTournament} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70">
                                    {isLoading ? 'Creating Room...' : 'Create Room'}
                                    {!isLoading && <ArrowRight size={16} className="ml-1.5" />}
                                </button>
                            </div>
                        )}

                        {/* TAB: JOIN WITH CODE */}
                        {activeTab === 'join' && (
                            <div className="animate-in fade-in duration-300">
                                <div className="mb-5">
                                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tournament Code</label>
                                    <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER 6-DIGIT CODE" maxLength={6} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-center tracking-widest uppercase text-lg" />
                                </div>
                                <button onClick={handleJoinTournament} disabled={isLoading} className="w-full bg-slate-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70">
                                    {isLoading ? 'Joining...' : 'Join Room'}
                                </button>
                            </div>
                        )}

                        {/* TAB: LOBBIES */}
                        {activeTab === 'lobbies' && (
                            <div className="animate-in slide-in-from-left-4 duration-300">
                                {isLoadingLeagues ? (
                                    <p className="text-center text-xs font-semibold text-slate-400 py-6">Searching active rooms...</p>
                                ) : availableLeagues.length === 0 ? (
                                    <p className="text-center text-xs font-semibold text-slate-400 py-6">No active rooms found.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {availableLeagues.map(league => (
                                            <LeagueCard 
                                                key={league.id} 
                                                league={league} 
                                                onJoinClick={(code) => handleJoinTournament(null, code)} 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}