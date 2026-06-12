import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './'로 두면 GitHub Pages의 리포 하위 경로에서도 그대로 동작한다.
export default defineConfig({
  plugins: [react()],
  base: './',
});
