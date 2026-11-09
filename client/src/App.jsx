import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { tokenStore } from './api.js';
import { useAuth } from './AuthContext.jsx';
import { PageSkeleton } from './components/Skeletons.jsx';
import RouteProgress, { TopBar } from './components/RouteProgress.jsx';
import AuthPage from './pages/AuthPage.jsx';

// الداشبورد (ومعاه الفورمز والرسوم) مش محتاجها اللي لسه هيسجل دخول، فبنحمّلها lazy.
// صفحة الدخول فضلت في الـ bundle الأساسي لأنها أول حاجة بيشوفها الزائر الجديد.
const loadDashboard = () => import('./pages/Dashboard.jsx');
const Dashboard = lazy(loadDashboard);

// لو فيه توكن محفوظ يبقى غالبًا هنروح للداشبورد: نبدأ نحمّل ملفها فورًا
// بالتوازي مع طلب /auth/me بدل ما نستنى الأول يخلص (ده بيشيل "الشلال" من التحميل).
if (tokenStore.get()) loadDashboard();

// زائر جديد؟ نحمّل الداشبورد في الخلفية وقت فراغ المتصفح، فبعد تسجيل الدخول تفتح فورًا.
const whenIdle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn) : setTimeout(fn, 1200));

// صفحة محمية: لو مفيش مستخدم نوديه لصفحة الدخول
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  return user ? children : <Navigate to="/login" replace />;
}

// صفحة الدخول/التسجيل: لو المستخدم داخل بالفعل نوديه للداشبورد
function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!user && !loading) whenIdle(loadDashboard);
  }, [user, loading]);
  if (loading) return <PageSkeleton />;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <>
      <RouteProgress />
      {/* أثناء تحميل ملف صفحة: شريط التقدم فوق + هيكل الصفحة (مفيش شاشة بيضاء أبدًا) */}
      <Suspense fallback={<><TopBar /><PageSkeleton /></>}>
        <Routes>
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><AuthPage mode="register" /></PublicOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
