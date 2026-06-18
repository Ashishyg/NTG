import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030507] px-4 py-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(94,234,212,0.06)_0%,transparent_65%)]" />
        <div className="absolute left-1/4 top-1/4 h-[30vh] w-[40vw] rounded-full bg-[radial-gradient(ellipse,rgba(124,58,237,0.05)_0%,transparent_65%)]" />
      </div>
      {children}
    </div>
  );
}
