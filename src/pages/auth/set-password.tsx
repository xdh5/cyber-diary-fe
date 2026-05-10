import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BaseInput, BaseButton } from '../../components/atoms';

const SetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isFirstTime = !location.state?.fromProfile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }

    setIsLoading(true);

    try {
      await setPassword(newPassword, oldPassword || undefined);
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置密码失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-20">
          <img src="/assets/icon.png" alt="Cyber Diary" className="h-16 w-auto mx-auto" />
        </div>

        <p className="text-center text-slate-500 text-sm mb-6">
          {isFirstTime ? '第一次登录，请设置一个密码' : '更新您的登录密码'}
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2 items-start mb-4">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">密码设置成功！即将跳转...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start mb-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirstTime && (
            <BaseInput
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="原密码"
              required
            />
          )}

          <BaseInput
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="新密码（至少 6 个字符）"
            required
            minLength={6}
          />

          <BaseInput
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="确认密码"
            required
            minLength={6}
          />

          {newPassword && confirmPassword && newPassword === confirmPassword && (
            <p className="text-xs text-green-600 pl-1">✓ 密码一致</p>
          )}

          <BaseButton
            type="submit"
            disabled={isLoading || success}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '设置中...' : '确认设置'}
          </BaseButton>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;
