// تصدير المصروفات لملف CSV بيفتح في Excel.
// 1) أي خلية بتبدأ بـ = + - @ بنحط قبلها ' عشان Excel ميعتبرهاش معادلة (CSV injection).
// 2) بنضيف BOM في الأول عشان Excel يقرا الحروف العربي صح.
const cell = (value) => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function expensesToCsv(expenses) {
  const rows = [['Date', 'Title', 'Category', 'Amount (EGP)', 'Note']];
  for (const e of expenses) rows.push([e.date, e.title, e.category, e.amount, e.note]);
  return '\ufeff' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(filename, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
