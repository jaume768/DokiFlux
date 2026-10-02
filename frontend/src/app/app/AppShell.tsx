"use client";

import { Sidebar } from "@/components/Sidebar";
import { ModelsProvider } from "@/context/ModelsContext";
import { MobileSidebarProvider, useMobileSidebar } from "@/context/MobileSidebarContext";
import { ActiveGenerationsProvider } from "@/context/ActiveGenerationsContext";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useMobileSidebar();

  return (
    <div className="app-scope flex overflow-hidden" style={{ background: "#0a0a0f", height: "100dvh" }}>
      <Sidebar isOpen={isOpen} onClose={close} />
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ModelsProvider>
      <ActiveGenerationsProvider>
        <MobileSidebarProvider>
          <AppLayoutInner>{children}</AppLayoutInner>
        </MobileSidebarProvider>
      </ActiveGenerationsProvider>
    </ModelsProvider>
  );
}
