import { NavLink } from 'react-router-dom';
import { BookOpen, SunMedium, UtensilsCrossed } from 'lucide-react';

const TabBar = () => {
  const tabs = [
    { path: '/today', label: '今天', icon: SunMedium },
    { path: '/food', label: '美食', icon: UtensilsCrossed },
    { path: '/journal', label: '日记本', icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100">
      <div className="flex items-center justify-around py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/today'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition ${
                  isActive
                    ? 'bg-slate-100 text-[var(--color-primary)]'
                    : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-xs">{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;