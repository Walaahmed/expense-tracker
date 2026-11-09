import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// في وضع التطوير أي طلب يبدأ بـ /api بيتحوّل للسيرفر على بورت 4000،
// فمش محتاجين CORS ولا بنكتب عنوان السيرفر في الكود.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
  build: {
    // recharts تقيلة (مع d3). بنفصلها في ملف لوحدها: صفحة الدخول مش بتحمّلها خالص،
    // والداشبورد بيعرض الأرقام والقوايم الأول وبعدين الرسوم لما توصل.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](recharts|d3-[^\\/]+|victory-vendor|recharts-scale|decimal\.js-light)[\\/]/.test(id)) return 'charts';
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
