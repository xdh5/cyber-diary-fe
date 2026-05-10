import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { BaseButton } from '../../components/atoms';

const GoogleCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const hasHandledRef = useRef(false);

  useEffect(() => {
    if (hasHandledRef.current) return;
    hasHandledRef.current = true;
    // 新流程通过弹窗完成，此页面不再处理回调，直接跳回登录
    const timer = window.setTimeout(() => navigate('/auth/login'), 2000);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-20">
          <img src="/assets/icon.png" alt="Cyber Diary" className="h-16 w-auto mx-auto" />
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start mb-6">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">页面已失效，即将返回登录页...</p>
        </div>

        <BaseButton variant="secondary" onClick={() => navigate('/auth/login')}>
          返回登录
        </BaseButton>
      </div>
    </div>
  );
};

export default GoogleCallbackPage;
