import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import "./styles/globals.css"
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
       <ChatProvider>
         <BrowserRouter>
           <App />
        </BrowserRouter>
       </ChatProvider>
    </AuthProvider>
  </React.StrictMode>,
)
