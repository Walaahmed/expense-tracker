import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// شريط رفيع فوق الصفحة (زي YouTube/GitHub) بيظهر وقت الانتقال بين الصفحات.
// بيتعرض في حالتين: تغيّر الـ URL، أو إنه يكون fallback لـ Suspense وقت تحميل صفحة.
export function TopBar() {
  return (
    <div className="topbar-progress" role="progressbar" aria-label="Loading page">
      <span />
    </div>
  );
}

export default function RouteProgress() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = setTimeout(() => setActive(false), 650);
    return () => clearTimeout(t);
  }, [pathname]);

  return active ? <TopBar key={pathname} /> : null;
}
