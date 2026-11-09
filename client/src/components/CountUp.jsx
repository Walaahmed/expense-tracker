import { memo } from 'react';
import { useCountUp } from '../hooks/useCountUp.js';

// بيعرض رقم بيعدّ لحد القيمة. format هي الدالة اللي بتحوّل الرقم لنص (money مثلاً).
function CountUp({ value, format }) {
  const current = useCountUp(value);
  return <>{format(current)}</>;
}
export default memo(CountUp);
