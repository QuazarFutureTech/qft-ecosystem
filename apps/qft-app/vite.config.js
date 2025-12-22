import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Explicitly set the port to 5173 and ensure it binds to localhost
    port: 5173,
    strictPort: true, 
    host: '0.0.0.0'
  }
});