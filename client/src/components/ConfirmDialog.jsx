import { useEffect, useRef } from 'react';

// بديل window.confirm: شكله متناسق مع الموقع، وبيحبس الفوكس جواه ويتقفل بـ Escape.
export default function ConfirmDialog({ title, body, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    cancelRef.current?.focus(); // الفوكس يبدأ على "Cancel" عشان الحذف ميحصلش بالغلط بـ Enter
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Tab') {
        const items = dialogRef.current.querySelectorAll('button');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onCancel]);

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" ref={dialogRef}>
        <h2 id="dlg-title">{title}</h2>
        {body && <p className="muted">{body}</p>}
        <div className="form-actions">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn danger solid" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
