import { useState } from 'react';
import { Trophy, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createTournament } from '../services/tournamentService';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import teamsData from '../data/teams.json';

// Gộp chung tất cả các đội từ EPL và C1 lại, loại bỏ trùng lặp và sắp xếp A-Z
const allTeams = [
    ...Object.values(teamsData.epl_teams).flat(),
    ...Object.values(teamsData.c1_teams).flat()
];
const FAVORITE_TEAMS = [...new Set(allTeams)].sort((a, b) => a.localeCompare(b));

export default function Home() {
    const [playerName, setPlayerName] = useState('');
    const [favoriteTeam, setFavoriteTeam] = useState(FAVORITE_TEAMS[0] || 'Arsenal');
    const [activeTab, setActiveTab] = useState('create');
    const [selectedMode, setSelectedMode] = useState('premier_league');
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

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

    const handleJoinTournament = async (e) => {
        if (e && e.preventDefault) e.preventDefault();

        // 1. Chỉ bắt buộc nhập Code và Tên để kiểm tra DB
        if (!joinCode.trim() || !playerName.trim()) {
            alert("Please enter both Room Code and Manager Name.");
            return;
        }

        if (joinCode.trim().length !== 6) {
            alert("Valid 6-digit code required!");
            return;
        }

        setIsLoading(true);
        try {
            const docRef = doc(db, 'tournaments', joinCode.toUpperCase());
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                alert("Tournament not found! Please check the code.");
                setIsLoading(false);
                return;
            }

            const tournament = docSnap.data();

            // 2. Kiểm tra xem người chơi đã tồn tại chưa (không phân biệt chữ hoa/thường)
            const existingPlayer = tournament.players?.find(
                p => p.name.toLowerCase() === playerName.trim().toLowerCase()
            );

            if (existingPlayer) {
                // RE-JOIN: Bỏ qua First Pick mới, lấy toàn bộ dữ liệu gốc từ Firebase
                const userData = {
                    ...existingPlayer,
                    roomCode: tournament.code
                };
                localStorage.setItem('fc27_user', JSON.stringify(userData));
                navigate('/dashboard');
                return; // Kết thúc sớm, không chạy code thêm người mới ở dưới
            }

            // 3. KỊCH BẢN: NGƯỜI CHƠI MỚI TINH
            if (!favoriteTeam) {
                alert("New players must select a First Pick team!");
                setIsLoading(false);
                return;
            }

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

            <div className="relative z-10 flex-1 px-6 pt-16 pb-8 flex flex-col justify-center">
                <div className="text-center mb-10 mt-4">
                    <div className="bg-white/10 p-4 rounded-full inline-block mb-4 backdrop-blur-sm border border-white/20">
                        <Trophy size={48} className="text-amber-400" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">FC27 Manager</h1>
                    <p className="text-slate-500 font-bold mt-1">Draft, Track & Conquer</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-6">
                    <div className="flex border-b border-slate-100">
                        <button onClick={() => setActiveTab('create')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>Host a Tournament</button>
                        <button onClick={() => setActiveTab('join')} className={`flex-1 py-4 font-bold text-sm transition-colors ${activeTab === 'join' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-slate-400 hover:bg-slate-50'}`}>Join with Code</button>
                    </div>

                    <div className="p-6">
                        {/* INPUT NAME */}
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Your Manager Name</label>
                            <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="e.g. Pep Guardiola" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" />
                        </div>

                        {/* SELECT FAVORITE TEAM */}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">First Pick (Favorite Team)</label>
                            <select
                                value={favoriteTeam}
                                onChange={(e) => setFavoriteTeam(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all"
                            >
                                {FAVORITE_TEAMS.map(teamName => (
                                    <option key={teamName} value={teamName}>{teamName}</option>
                                ))}
                            </select>
                        </div>

                        {activeTab === 'create' ? (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Format</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div onClick={() => setSelectedMode('premier_league')} className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedMode === 'premier_league' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                            {selectedMode === 'premier_league' && <CheckCircle2 size={18} className="absolute top-2 right-2 text-blue-500" />}
                                            <div className="font-bold text-slate-800 mb-1">Premier League</div>
                                            <div className="text-xs font-semibold text-slate-400">20 Teams • 4 Players</div>
                                        </div>
                                        <div onClick={() => setSelectedMode('ucl')} className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedMode === 'ucl' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                                            {selectedMode === 'ucl' && <CheckCircle2 size={18} className="absolute top-2 right-2 text-blue-500" />}
                                            <div className="font-bold text-slate-800 mb-1">UCL</div>
                                            <div className="text-xs font-semibold text-slate-400">36 Teams • 4 Players</div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleCreateTournament} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70">
                                    {isLoading ? 'Creating Room...' : 'Create & Generate Code'}
                                    {!isLoading && <ArrowRight size={20} className="ml-2" />}
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-left-4 duration-300">
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tournament Code</label>
                                    <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ENTER 6-DIGIT CODE" maxLength={6} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white transition-all text-center tracking-widest uppercase" />
                                </div>
                                <button onClick={handleJoinTournament} disabled={isLoading} className="w-full bg-slate-800 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70">
                                    {isLoading ? 'Joining...' : 'Join Tournament'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}