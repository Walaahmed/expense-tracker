import { memo } from 'react';
import { CategoryChart, DailyChart, MonthlyChart } from './Charts.jsx';

// ده الملف اللي بيتحمّل lazy: هو اللي بيسحب recharts معاه في chunk لوحده.
// memo: الرسوم متتعادش رسمها لو الداتا ما اتغيرتش (مثلاً لما بنكتب في خانة البحث).
function ChartsSection({ stats }) {
  return (
    <div className="charts">
      <CategoryChart data={stats.byCategory} total={stats.total} />
      <MonthlyChart data={stats.monthly} />
      <DailyChart data={stats.daily} month={stats.month} />
    </div>
  );
}
export default memo(ChartsSection);
