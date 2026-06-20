import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// StrictMode désactivé : son double-mount en dev fait double-initialiser le monde
// Rapier (@react-three/rapier). Cf. CLAUDE.md §8.
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root introuvable')

createRoot(rootEl).render(<App />)
