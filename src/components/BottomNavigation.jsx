import { Swords, Calendar, CheckSquare, Trophy } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomNavigation() {
    const navigate = useNavigate();
    const location = useLocation();

    // Ẩn thanh nav ở trang Home
    if (location.pathname === '/') return null;

    const tabs = [
        { id: '/my-matches', label: 'My Matches', icon: Swords },
        { id: '/upcoming', label: 'Upcoming', icon: Calendar },
        { id: '/results', label: 'Results', icon: CheckSquare },
        { id: '/standings', label: 'Standings', icon: Trophy },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = location.pathname.includes(tab.id);

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.id)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 
                ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}