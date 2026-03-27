"use client";

import { Sidebar } from "@/components/Sidebar";
import { ModelsProvider } from "@/context/ModelsContext";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModelsProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </ModelsProvider>
  );
}
