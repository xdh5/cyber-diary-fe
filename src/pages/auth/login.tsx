import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BaseInput, BaseButton } from '../../components/atoms';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { password_required } = await login(email, password);
      if (password_required) {
        navigate('/auth/set-password', { state: { email } });
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <BaseInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Username, email or mobile number"
            required
          />

          <BaseInput
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />

          <BaseButton
            type="submit"
            disabled={isLoading}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登录中...' : '登录'}
          </BaseButton>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-slate-600">或使用</span>
          </div>
        </div>

        <BaseButton variant="secondary">
          <img src="/assets/icon/google.svg" alt="" className="w-5 h-5" />
          Google 登录
        </BaseButton>

        <p className="text-center text-sm text-slate-600 mt-6">
          还没有账户？{' '}
          <span className="text-slate-900 font-medium">
            立即注册
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;