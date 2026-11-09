// شكل "هيكل" الصفحة وهي بتتحمّل: أحسن من كلمة Loading لأن العين بتشوف الشكل النهائي
// فالصفحة مش بتقفز لما البيانات توصل.
const Sk = ({ w = '100%', h = 14, r = 8, style }) => (
  <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />
);

export function SummarySkeleton() {
  return (
    <div className="summary" aria-busy="true" aria-label="Loading summary">
      {[0, 1, 2, 3].map((i) => (
        <div className="card stat" key={i}>
          <Sk w="45%" h={12} />
          <Sk w="70%" h={28} r={10} />
          <Sk w="55%" h={12} />
        </div>
      ))}
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="charts" aria-busy="true" aria-label="Loading charts">
      {[0, 1, 2].map((i) => (
        <div className="card chart-card" key={i}>
          <Sk w="40%" h={16} />
          <Sk w="55%" h={12} style={{ margin: '8px 0 16px' }} />
          <Sk h={200} r={12} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <ul className="expense-list" aria-busy="true" aria-label="Loading expenses">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i}>
          <Sk w={12} h={12} r={6} />
          <div className="expense-main" style={{ gap: 6 }}>
            <Sk w="42%" h={14} />
            <Sk w="28%" h={11} />
          </div>
          <Sk w={70} h={16} />
        </li>
      ))}
    </ul>
  );
}

export function PageSkeleton() {
  return (
    <div className="shell" aria-busy="true">
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true" />Spendly</div>
      </header>
      <main className="container">
        <Sk w={180} h={30} r={10} style={{ marginBottom: 22 }} />
        <SummarySkeleton />
        <ChartsSkeleton />
      </main>
    </div>
  );
}
