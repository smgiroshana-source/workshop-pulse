export const metadata = { title: "Workshop Pulse", description: "MacForce Auto Engineering - Workshop Management" }
export default function RootLayout({ children }) {
  return (<html lang="en"><head><style dangerouslySetInnerHTML={{ __html: `
    input:focus, textarea:focus, select:focus { border-color: #007AFF !important; box-shadow: 0 0 0 3px rgba(0,122,255,0.25) !important; }
    input::placeholder { color: #AEAEB2; }
    * { -webkit-tap-highlight-color: transparent; }
  `}} /></head><body style={{ margin: 0, padding: 0 }}>{children}</body></html>)
}
