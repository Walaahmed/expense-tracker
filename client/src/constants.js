// لازم تتطابق مع CATEGORIES في server/src/models/expenses.js
// (السيرفر هو المرجع الحقيقي: بيرفض أي تصنيف مش في قائمته)
export const CATEGORIES = [
  { name: 'Food', color: '#e8833a' },
  { name: 'Transport', color: '#2e86ab' },
  { name: 'Shopping', color: '#c2478b' },
  { name: 'Bills', color: '#7a6ff0' },
  { name: 'Health', color: '#2fa37a' },
  { name: 'Entertainment', color: '#d9a920' },
  { name: 'Education', color: '#8a5a44' },
  { name: 'Other', color: '#8896a6' },
];

export const categoryColor = (name) =>
  CATEGORIES.find((c) => c.name === name)?.color ?? '#8896a6';
