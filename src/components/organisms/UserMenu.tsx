import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type UserMenuProps = {
  mode?: 'default' | 'account' | 'avatar';
};

const UserMenu: React.FC<UserMenuProps> = ({ mode = 'default' }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      {mode === 'account' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
          title={user.email}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nickname}
              className="w-6 h-6 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <UserCircle2 size={20} />
          )}
          Account
        </button>
      ) : mode === 'avatar' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:border-slate-300"
          title={user.email}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nickname}
              className="h-9 w-9 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
              {(user.nickname || 'U').charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
          title={user.email}
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.nickname}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold">
              {(user.nickname || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium text-slate-700">{user.nickname}</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="p-3 border-b border-slate-200">
            <p className="text-xs font-medium text-slate-500">已登录</p>
            <p className="text-sm text-slate-900 truncate">{user.email}</p>
          </div>

          <button
            onClick={() => {
              navigate('/setting');
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition"
          >
            <Settings size={16} />
            账户设置
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2 transition border-t border-slate-200"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
