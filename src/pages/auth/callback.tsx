import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = React.useState('');
  const hasHandledRef = useRef(false);
  const redirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hasHandledRef.current) {
      return;
    }
    hasHandledRef.current = true;

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Google 认证失败: ${errorParam}`);
        redirectTimerRef.current = window.setTimeout(() => navigate('/auth/login'), 3000);
        return;
      }

      if (!code) {
        setError('无效的授权码');
        redirectTimerRef.current = window.setTimeout(() => navigate('/auth/login'), 3000);
        return;
      }

      try {
        const { password_required } = await googleLogin(code);
        if (password_required) {
          navigate('/auth/set-password');
        } else {
          navigate('/');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google 登录失败');
        redirectTimerRef.current = window.setTimeout(() => navigate('/auth/login'), 3000);
      }
    };

    handleCallback();

    return () => {
      if (redirectTimerRef.current !== null) {
        window.clearTimeout(redirectTimerRef.current);
      }
    };
  }, [searchParams, googleLogin, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {error ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 items-start mb-4">
                <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-700 font-medium">登录失败</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm">即将返回登录页...</p>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
              <p className="text-slate-900 font-medium mt-4">正在验证身份...</p>
              <p className="text-slate-600 text-sm mt-2">请稍候</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
