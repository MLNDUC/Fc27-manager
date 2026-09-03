import { useState, useEffect } from 'react';
import { LogOut, Home, Swords, Trophy, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function MainLayout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('fc27_user');
        if (userData) {
            setCurrentUser(JSON.parse(userData));
        } else {
            setCurrentUser(null);
        }
    }, [location.pathname]);

    const isHome = location.pathname === '/';

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: Home },
        { path: '/my-matches', label: 'Matches', icon: Swords },
        { path: '/standings', label: 'Standings', icon: Trophy }
    ];

    return (
        <div className="min-h-screen bg-slate-100 font-sans pb-16">
            <header className="bg-slate-900 p-4 shadow-md fixed top-0 w-full z-50 max-w-md mx-auto left-0 right-0 flex items-center justify-between">
                <div className="flex-1"></div>

                {/* TIÊU ĐỀ APP */}
                <h1 className="text-xl font-black tracking-tighter text-center whitespace-nowrap text-white px-2">
                    FC27 <span className="text-emerald-400">SAITAMA OPEN</span>
                </h1>

                <div className="flex-1 flex justify-end items-center gap-2">
                    {!isHome && currentUser && (
                        <>
                            {/* ĐÃ SỬA: Giảm size chữ xuống text-sm, giảm khoảng cách chữ, thu nhỏ icon để không lấn tiêu đề */}
                            <div className="flex items-center gap-1 max-w-[100px]">
                                <User size={14} className="text-rose-500 shrink-0" />
                                <span className="text-sm font-black text-rose-500 truncate uppercase tracking-wider drop-shadow-sm">
                                    {currentUser.name}
                                </span>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to leave this tournament?')) {
                                        localStorage.removeItem('fc27_user');
                                        navigate('/');
                                    }
                                }}
                                className="text-slate-400 hover:text-rose-400 transition-colors active:scale-95 bg-white/5 p-1.5 rounded-lg shrink-0"
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="pt-16 max-w-md mx-auto min-h-screen bg-white shadow-xl relative z-10 pb-20">
                {children}
            </main>

            {!isHome && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-4 py-2 z-50 max-w-md mx-auto">
                    <div className="flex justify-between items-center">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex flex-col items-center justify-center w-16 transition-all duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <div className={`p-1.5 rounded-xl mb-0.5 ${isActive ? 'bg-blue-50 scale-110' : 'bg-transparent'}`}>
                                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}