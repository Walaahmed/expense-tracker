// الـ splash موجود في index.html وبيتعرض قبل ما React يتحمّل.
// هنا بنشيله بعد ما التطبيق يجهز، بس مش قبل 700ms من فتح الصفحة
// عشان الأنيميشن ما يتقطعش لو النت سريع (وميبانش وميض).
const MIN_VISIBLE_MS = 700;

export function hideSplash() {
  const el = document.getElementById('splash');
  if (!el || el.dataset.leaving) return;
  el.dataset.leaving = '1';
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 600); // نشيله من الـ DOM بعد الـ fade
  }, wait);
}
