/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  // En desarrollo, /api va al backend local (uvicorn): así la cookie de sesión es del mismo origen (arquitectura, 8).
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  build: {
    // Las dependencias van en su propio fragmento: el navegador las guarda entre versiones de la interfaz.
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'dependencias', test: /node_modules/ }] } } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/preparar.ts'],
    // Con todas las vistas en paralelo (T-02b), montar la aplicación completa puede pasar de los 5 s por omisión.
    testTimeout: 15_000,
  },
})
