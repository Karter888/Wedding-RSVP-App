import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import Footer from './components/Footer';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider publishableKey={clerkKey || 'pk_test_placeholder'}>
      <AuthProvider>
        <BrowserRouter>
          <App />
          <Footer />
        </BrowserRouter>
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>,
)
