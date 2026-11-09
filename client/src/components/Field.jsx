// label + input + رسالة الخطأ. الـ label ملفوف حوالين الـ input فالضغط على النص
// بيفتح الحقل، وقارئات الشاشة بتربطهم لوحدها.
export default function Field({ label, error, hint, className = '', children }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span>{label}</span>
      {children}
      {error ? (
        <small className="field-error" role="alert">{error}</small>
      ) : (
        hint && <small className="muted">{hint}</small>
      )}
    </label>
  );
}
