/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // Las dependencias van en su propio fragmento: el navegador las guarda entre versiones de la interfaz.
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'dependencias', test: /node_modules/ }] } } },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/pruebas/preparar.ts'],
  },
})
