import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './shared/i18n' // Initialize i18n
import { TimeProvider } from './context/TimeContext'
import { ThemeProvider } from './shared/components/ThemeProvider'
import { ToastProvider } from './shared/context/ToastContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TimeProvider>
            <ThemeProvider>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </ThemeProvider>
        </TimeProvider>
    </React.StrictMode>,
)
