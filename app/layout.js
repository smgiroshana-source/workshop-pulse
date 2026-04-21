export const dynamic = "force-dynamic"
export const metadata = { title: "Workshop Pulse", description: "MacForce Auto Engineering - Workshop Management" }
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#007AFF",
}
export default function RootLayout({ children }) {
  return (<html lang="en"><head>
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="format-detection" content="telephone=no" />
    <style dangerouslySetInnerHTML={{ __html: `
    html, body { overscroll-behavior-y: contain; }
    body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; padding-bottom: env(safe-area-inset-bottom); }
    input:focus, textarea:focus, select:focus { border-color: #007AFF !important; box-shadow: 0 0 0 3px rgba(0,122,255,0.25) !important; }
    input::placeholder { color: #AEAEB2; }
    * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }

    /* Touch optimizations */
    button, a { touch-action: manipulation; }

    /* Safe area padding for notched devices */
    .safe-top { padding-top: env(safe-area-inset-top); }
    .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

    /* Button interactions (desktop hover only) */
    @media (hover: hover) {
      button:hover:not(:disabled) { filter: brightness(1.05); transform: translateY(-1px); }
    }
    button:active:not(:disabled) { transform: translateY(0) scale(0.98); filter: brightness(0.95); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Mobile: single-column hub, bigger taps */
    @media (max-width: 480px) {
      [data-hub-grid] { grid-template-columns: 1fr !important; gap: 10px !important; }
      [data-today-strip] { flex-wrap: wrap !important; }
      [data-today-strip] > * { flex: 1 1 45% !important; }
      /* Big card padding shrinks a bit */
      [data-hub-grid] > div { padding: 16px 14px !important; }
    }

    /* Narrow phones: tighter horizontal padding */
    @media (max-width: 375px) {
      body { font-size: 15px; }
    }

    /* iOS: prevent zoom on input focus — inputs must be at least 16px */
    @supports (-webkit-touch-callout: none) {
      input[type="text"], input[type="number"], input[type="tel"], input[type="email"], input[type="date"], textarea, select {
        font-size: max(16px, 1em) !important;
      }
    }

    /* Hide desktop-only hints on touch devices */
    @media (hover: none), (max-width: 768px) {
      .desktop-only { display: none !important; }
    }

    /* Card hover */
    [data-card-hover]:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
    [data-card-hover] { transition: all 0.15s ease; }

    /* Toast animation */
    @keyframes slideUp { from { transform: translateX(-50%) translateY(20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
    .toast-appear { animation: slideUp 0.25s ease-out; }

    /* Success celebration */
    @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
    .celebrate { animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

    /* Pulse for active elements */
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .pulse { animation: pulse 2s ease-in-out infinite; }

    /* Skeleton loader */
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite linear; border-radius: 8px; }

    /* Smooth scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }

    /* Fade in for screens */
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .screen-fade { animation: fadeIn 0.2s ease-out; }
  `}} /></head><body style={{ margin: 0, padding: 0 }}>{children}</body></html>)
}
