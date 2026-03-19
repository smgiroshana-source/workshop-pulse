"use client"
import AuthGate from "./AuthGate"
import App from "./WorkshopPulse"

export default function Page() {
  return <AuthGate><App /></AuthGate>
}
