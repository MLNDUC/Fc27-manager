import { useState, useEffect } from 'react';
import { X, Delete, Target } from 'lucide-react';

export default function ScoreInputModal({ isOpen, onClose, match, onSubmit, isKnockout = true }) {
    const [homeScore, setHomeScore] = useState('');
    const [awayScore, setAwayScore] = useState('');

    // States cho Penalties
    const [hasPenalties, setHasPenalties] = useState(false);
    const [homePen, setHomePen] = useState('');
    const [awayPen, setAwayPen] = useState('');

    // activeInput: 'home' | 'away' | 'homePen' | 'awayPen'
    const [activeInput, setActiveInput] = useState('home');

    useEffect(() => {
        if (isOpen) {
            setHomeScore('');
            setAwayScore('');
            setHasPenalties(false);
            setHomePen('');
            setAwayPen('');
            setActiveInput('home');
        }
    }, [isOpen]);

    if (!isOpen || !match) return null;

    const handleNumpad = (val) => {
        const updateScore = (setter, prev) => {
            if (val === 'C') return '';
            if (val === 'DEL') return prev.slice(0, -1);
            return (prev + val).slice(0, 2); // Tối đa 2 chữ số
        };

        if (activeInput === 'home') setHomeScore(prev => updateScore(setHomeScore, prev));
        else if (activeInput === 'away') setAwayScore(prev => updateScore(setAwayScore, prev));
        else if (activeInput === 'homePen') setHomePen(prev => updateScore(setHomePen, prev));
        else if (activeInput === 'awayPen') setAwayPen(prev => updateScore(setAwayPen, prev));
    };

    const numpadKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'];

    const handleSubmit = () => {
        // Trả về cả tỉ số chính và tỉ số Pen (nếu có)
        onSubmit({
            homeScore: homeScore || '0',
            awayScore: awayScore || '0',
            hasPenalties,
            homePen: hasPenalties ? (homePen || '0') : null,
            awayPen: hasPenalties ? (awayPen || '0') : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex flex-col justify-end backdrop-blur-sm transition-all">
            <div className="flex-1" onClick={onClose}></div>

            <div className="bg-white rounded-t-3xl shadow-2xl max-w-md w-full mx-auto pb-safe animate-in slide-in-from-bottom duration-300">

                <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800 text-lg">Enter Match Score</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 bg-slate-50/50 space-y-4">
                    {/* TỈ SỐ CHÍNH */}
                    <div className="flex items-center justify-between gap-4">
                        <div
                            onClick={() => setActiveInput('home')}
                            className={`flex-1 flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === 'home' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                                }`}
                        >
                            <span className="text-xs font-semibold text-slate-500 mb-1 truncate w-full text-center">{match.home || match.teamA?.name}</span>
                            <span className="text-4xl font-black text-slate-800 h-10 leading-none">{homeScore || '0'}</span>
                        </div>

                        <div className="text-slate-300 font-bold text-xl">-</div>

                        <div
                            onClick={() => setActiveInput('away')}
                            className={`flex-1 flex flex-col items-center p-4 rounded-2xl border-2 transition-all cursor-pointer ${activeInput === 'away' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200'
                                }`}
                        >
                            <span className="text-xs font-semibold text-slate-500 mb-1 truncate w-full text-center">{match.away || match.teamB?.name}</span>
                            <span className="text-4xl font-black text-slate-800 h-10 leading-none">{awayScore || '0'}</span>
                        </div>
                    </div>

                    {/* TOGGLE PENALTIES (Chỉ hiện nếu là vòng Knockout) */}
                    {isKnockout && (
                        <div className="pt-2">
                            <label className="flex items-center justify-center cursor-pointer gap-2 mb-3">
                                <input
                                    type="checkbox"
                                    checked={hasPenalties}
                                    onChange={(e) => {
                                        setHasPenalties(e.target.checked);
                                        if (e.target.checked) setActiveInput('homePen');
                                        else setActiveInput('home');
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                />
                                <span className="text-sm font-semibold text-slate-600 flex items-center">
                                    <Target size={16} className="mr-1.5" /> Match went to Penalties?
                                </span>
                            </label>

                            {/* KHU VỰC NHẬP TỈ SỐ PENALTY */}
                            {hasPenalties && (
                                <div className="flex items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-200">
                                    <div
                                        onClick={() => setActiveInput('homePen')}
                                        className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition-all cursor-pointer ${activeInput === 'homePen' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                                            }`}
                                    >
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">PEN</span>
                                        <span className="text-2xl font-black text-slate-700 h-7 leading-none">{homePen || '0'}</span>
                                    </div>

                                    <div className="text-slate-300 font-bold text-sm">-</div>

                                    <div
                                        onClick={() => setActiveInput('awayPen')}
                                        className={`flex-1 flex flex-col items-center py-2 rounded-xl border-2 transition-all cursor-pointer ${activeInput === 'awayPen' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-indigo-200'
                                            }`}
                                    >
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">PEN</span>
                                        <span className="text-2xl font-black text-slate-700 h-7 leading-none">{awayPen || '0'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Numpad */}
                <div className="px-6 py-4 grid grid-cols-3 gap-3">
                    {numpadKeys.map((key, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleNumpad(key)}
                            className={`font-semibold text-2xl py-4 rounded-xl flex items-center justify-center transition-all active:scale-95 ${key === 'C' ? 'bg-red-50 text-red-500' :
                                    key === 'DEL' ? 'bg-slate-100 text-slate-600' :
                                        'bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-sm'
                                }`}
                        >
                            {key === 'DEL' ? <Delete size={24} /> : key}
                        </button>
                    ))}
                </div>

                <div className="p-6 pt-2">
                    <button
                        onClick={handleSubmit}
                        className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
                    >
                        Submit Score
                    </button>
                </div>
            </div>
        </div>
    );
}