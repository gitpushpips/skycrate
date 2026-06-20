import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Force une instance unique de React (sinon le pré-bundling de Vite peut en
    // créer une seconde pour leva → « Invalid hook call » dans l'arbre R3F).
    dedupe: ['react', 'react-dom', '@react-three/fiber', 'three'],
  },
})
