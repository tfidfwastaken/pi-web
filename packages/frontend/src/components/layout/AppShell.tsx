import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-full">
      <Header />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Footer />
    </div>
  );
}
