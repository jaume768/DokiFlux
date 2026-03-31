"use client";

import { Sidebar } from "@/components/Sidebar";
import { ModelsProvider } from "@/context/ModelsContext";
import { MobileSidebarProvider, useMobileSidebar } from "@/context/MobileSidebarContext";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useMobileSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModelsProvider>
      <MobileSidebarProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </MobileSidebarProvider>
    </ModelsProvider>
  );
}
