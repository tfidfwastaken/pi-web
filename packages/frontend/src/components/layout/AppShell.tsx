import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { useStore } from "../../store";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useStore((s) => s.ui.sidebarOpen);
  const connectionStatus = useStore((s) => s.connectionStatus);

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only show when connected */}
        {connectionStatus === "connected" && <Sidebar />}
        
        {/* Main content */}
        <main
          className={`flex-1 overflow-hidden transition-all duration-200 ${
            sidebarOpen && connectionStatus === "connected" ? "lg:ml-[300px]" : ""
          }`}
        >
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}
