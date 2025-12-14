import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Scoorly - PDF Question Extractor',
  description: 'Upload PDFs and extract questions automatically',
}

export default function RootLayout({ children }) {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7244/ingest/70428190-8d12-4fd8-af57-8512d8351def',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'layout.js:15',message:'RootLayout client-side execution',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion
  
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
      <Analytics />
    </ClerkProvider>
  )
}

