import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/organisms/ProtectedRoute';
import TabBar from './components/organisms/TabBar';
import TodayPage from './pages/today';
import JournalPage from './pages/journal';
import FoodPage from './pages/food';
import CountdownPage from './pages/countdown';
import RecordsPage from './pages/records';
import TodoPage from './pages/todo';
import EditorPage from './pages/editor';
import LoginPage from './pages/auth/login';
import RegisterPage from './pages/auth/register';
import SetPasswordPage from './pages/auth/set-password';
import GoogleCallbackPage from './pages/auth/callback';
import SettingPage from './pages/setting';

const App = () => {
  const location = useLocation();
  const isTodayChatModal = location.pathname === '/today' && new URLSearchParams(location.search).get('chat') === '1';

  const hideNav = location.pathname === '/editor' || location.pathname.startsWith('/auth') || isTodayChatModal;
  const isTodayPage = location.pathname === '/today' || location.pathname === '/';
  const isJournalPage = location.pathname === '/journal';
  const isRecordsPage = location.pathname === '/records';
  const isCountdownPage = location.pathname === '/countdown';
  const isTodoPage = location.pathname === '/todo';

  return (
    <AuthProvider>
      <div className="min-h-[100dvh] bg-white text-slate-900">
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<GoogleCallbackPage />} />
          <Route path="/auth/set-password" element={<SetPasswordPage />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div
                  className={
                    isTodayPage || isJournalPage || isRecordsPage || isCountdownPage || isTodoPage
                      ? ''
                      : 'mx-auto max-w-2xl px-4 pt-6 sm:px-6'
                  }
                  style={
                    isTodayPage || isJournalPage || isRecordsPage || isCountdownPage || isTodoPage
                      ? undefined
                      : {
                          paddingBottom:
                            'calc(var(--app-bottom-nav-height) + var(--app-tab-bottom-gap) + env(safe-area-inset-bottom, 0rem) + 0.875rem)',
                        }
                  }
                >
                  <Routes>
                    <Route path="/" element={<Navigate to="/today" replace />} />
                    <Route path="/today" element={<TodayPage />} />
                    <Route path="/records" element={<RecordsPage />} />
                    <Route path="/countdown" element={<CountdownPage />} />
                    <Route path="/todo" element={<TodoPage />} />
                    <Route path="/food" element={<FoodPage />} />
                    <Route path="/journal" element={<JournalPage />} />
                    <Route path="/editor" element={<EditorPage />} />
                    <Route path="/setting" element={<SettingPage />} />
                    <Route path="*" element={<Navigate to="/today" replace />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>

        {/* Navigation Bar - Only show when authenticated */}
        {!hideNav && <TabBar />}
      </div>
    </AuthProvider>
  );
};

export default App;