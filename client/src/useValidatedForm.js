import { useState } from 'react';
import { hasErrors } from './validation.js';

/**
 * Hook مشترك لكل الفورمز:
 *  - form / errors : الحالة
 *  - bind(key)     : بيرجع value + onChange + onBlur + aria-invalid للـ input
 *  - check(formEl) : بيتحقق من كل الحقول قبل الإرسال ويحط الفوكس على أول غلط
 *  - setErrors     : نستخدمه لعرض أخطاء جاية من السيرفر
 *
 * سلوك التحقق: الخطأ بيظهر لما تسيبي الحقل (blur) وهو مش فاضي، أو لما تدوسي إرسال،
 * ولما يظهر خطأ على حقل، بنعيد فحصه مع كل حرف عشان يختفي أول ما يتصلح.
 */
export function useValidatedForm(initial, validate) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  // نحدّث خطأ حقل واحد بس من غير ما نلمس باقي الأخطاء
  const setFieldError = (key, found) =>
    setErrors((prev) => {
      const next = { ...prev };
      if (found[key]) next[key] = found[key];
      else delete next[key];
      return next;
    });

  const bind = (key) => ({
    value: form[key],
    onChange: (e) => {
      const next = { ...form, [key]: e.target.value };
      setForm(next);
      if (errors[key]) setFieldError(key, validate(next));
    },
    // لو الحقل فاضي منظهرش خطأ "مطلوب" وقت blur: ظهور الرسالة بيزق الصفحة لتحت،
    // فالضغطة اللي بعدها (على زرار الإرسال مثلاً) بتضيع. "مطلوب" بتظهر عند الإرسال.
    onBlur: () => {
      if (String(form[key] ?? '').trim() === '') return;
      setFieldError(key, validate(form));
    },
    'aria-invalid': errors[key] ? 'true' : undefined,
  });

  function check(formEl) {
    const found = validate(form);
    setErrors(found);
    if (hasErrors(found)) {
      // setTimeout عشان نستنى React يرسم aria-invalid الأول
      setTimeout(() => formEl.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return false;
    }
    return true;
  }

  // بيرجّع الفورم لقيمها الأولى (بنستخدمه بعد حفظ ناجح)
  const reset = () => {
    setForm(initial);
    setErrors({});
  };

  return { form, errors, setErrors, bind, check, reset };
}
