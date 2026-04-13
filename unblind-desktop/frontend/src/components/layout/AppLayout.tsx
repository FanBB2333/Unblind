import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

type AppLayoutProps = {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function AppLayout({ children, currentPage, onNavigate }: AppLayoutProps) {
  return (
    <div className="flex h-screen">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
