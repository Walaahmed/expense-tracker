import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { categoryColor } from '../constants.js';
import { money, monthLabel } from '../format.js';

const compact = new Intl.NumberFormat('en', { notation: 'compact' });

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  color: 'var(--ink)',
  boxShadow: 'none',
};

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="card chart-card">
      <h2>{title}</h2>
      {subtitle && <p className="muted small">{subtitle}</p>}
      {children}
    </section>
  );
}

const Empty = ({ text = 'No data for this month yet' }) => (
  <div className="empty">{text}</div>
);

// 1) Donut: توزيع المصروفات على التصنيفات
export function CategoryChart({ data, total }) {
  return (
    <ChartCard title="Spending by category" subtitle="Where this month's money went">
      {data.length === 0 ? (
        <Empty />
      ) : (
        <div className="donut-layout">
          <div className="donut">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="category"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.category} fill={categoryColor(d.category)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* الـ legend بنعملها بإيدينا عشان تعرض الاسم والمبلغ والنسبة */}
          <ul className="legend">
            {data.map((d) => (
              <li key={d.category}>
                <span className="dot" style={{ background: categoryColor(d.category) }} />
                <span className="legend-name">{d.category}</span>
                <span className="legend-val">
                  {money(d.total)} <em>{Math.round((d.total / total) * 100)}%</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

// 2) Bar: آخر 6 شهور، والشهر المختار بلون مميز
export function MonthlyChart({ data }) {
  const selected = data[data.length - 1]?.month;
  const hasData = data.some((d) => d.total > 0);
  const rows = data.map((d) => ({ ...d, label: monthLabel(d.month, true) }));

  return (
    <ChartCard title="Last 6 months" subtitle="Total spending per month">
      {!hasData ? (
        <Empty text="Add expenses to see your trend" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v)} />
            <Tooltip
              formatter={(v) => [money(v), 'Spent']}
              labelFormatter={(_, p) => (p?.[0] ? monthLabel(p[0].payload.month) : '')}
              cursor={{ fill: 'var(--line)', opacity: 0.4 }}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={44}>
              {rows.map((r) => (
                <Cell key={r.month} fill={r.month === selected ? 'var(--accent)' : 'var(--bar-muted)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// 3) Area: المصروف يوم بيوم داخل الشهر
export function DailyChart({ data, month }) {
  const hasData = data.some((d) => d.total > 0);
  return (
    <ChartCard title="Daily spending" subtitle={`Day by day in ${monthLabel(month)}`}>
      {!hasData ? (
        <Empty />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => compact.format(v)} />
            <Tooltip
              formatter={(v) => [money(v), 'Spent']}
              labelFormatter={(d) => `Day ${d}`}
              contentStyle={tooltipStyle}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#dailyFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
