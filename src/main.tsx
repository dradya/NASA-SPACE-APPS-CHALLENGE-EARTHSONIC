import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/fraunces/wght.css'
import './styles/index.css'
import App from './App'
import { initContrast } from './a11y/contrast'

// Apply the saved or system contrast preference before the first render, so there is no flash.
initContrast()

const container = document.getElementById('root')
if (!container) throw new Error('EARTHSONIC: the #root element is missing from index.html')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
