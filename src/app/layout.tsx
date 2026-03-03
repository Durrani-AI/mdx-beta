import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CampusFlow — Middlesex University Navigation',
  description: 'Smart indoor/outdoor navigation for Middlesex University students',
}

export const viewport: Viewport = {
  themeColor: '#0d0d1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <style>{`
          /* Desktop: scale the phone frame so it always fits in one screen */
          @media (min-width: 640px) {
            html, body { height: 100%; overflow: hidden; background: #F7F8FA; }
            .phone-scaler {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .phone-frame {
              width: 390px;
              height: 844px;
              border-radius: 38px;
              overflow: hidden;
              /* Scale down to always fit viewport with 16px padding */
              scale: min(1, calc((100vh - 32px) / 844px));
            }
            .phone-inner {
              width: 100%;
              height: 100%;
              overflow: hidden; /* pages handle their own scroll */
            }
          }
          /* Mobile: just full-screen, no frame */
          @media (max-width: 639px) {
            .phone-scaler { display: contents; }
            .phone-frame { width: 100%; height: 100%; border-radius: 0; box-shadow: none; overflow: hidden; }
            .phone-inner { width: 100%; height: 100vh; overflow: hidden; }
          }
        `}</style>
      </head>
      <body className="antialiased">
        <div className="phone-scaler">
          <div className="phone-frame">
            <div id="app-shell" className="phone-inner">
              {children}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
