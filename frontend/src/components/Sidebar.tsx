"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import type { ProjectListItem, PaginatedResponse } from "@/types/auth";
import {
  Home,
  FolderOpen,
  LayoutTemplate,
  LogOut,
  Coins,
  Loader2,
} from "lucide-react";
import { useActiveGenerations } from "@/context/ActiveGenerationsContext";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, balance, planType } = useAuth();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: isProjectGenerating } = useActiveGenerations();

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiGet<PaginatedResponse<ProjectListItem>>("/projects/");
      setProjects(data.results.slice(0, 20));
    } catch {
      console.error("Error loading projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadProjects();
  }, [pathname, loadProjects]);

  useEffect(() => {
    const handler = () => loadProjects();
    window.addEventListener("sidebar:refresh", handler);
    return () => window.removeEventListener("sidebar:refresh", handler);
  }, [loadProjects]);

  const navItems = [
    { icon: Home, label: "Inicio", path: "/app" },
    { icon: LayoutTemplate, label: "Templates", path: "/app/templates" },
    { icon: FolderOpen, label: "Proyectos", path: "/app/dashboard" },
  ];

  function handleNav(path: string) {
    router.push(path);
    onClose?.();
  }

  return (
    <div
      className={`
        w-[240px] flex flex-col shrink-0
        fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300
        md:relative md:z-auto md:translate-x-0 md:shadow-none
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}
      style={{ background: "#0a0a0f", borderRight: "1px solid rgba(255,255,255,0.07)", height: "100dvh" }}
    >
      {/* ── Header (shrink-0) ── */}
      <div className="shrink-0 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button
          onClick={() => handleNav("/app")}
          className="flex items-center rounded-lg -mx-1 px-1 py-1 transition-colors hover:bg-white/[0.04] cursor-pointer"
          aria-label="Ir a inicio"
        >
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={160} height={40} className="h-8 w-auto" />
        </button>
      </div>

      {/* ── Navigation (shrink-0) ── */}
      <nav className="shrink-0 px-2 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={isActive
                ? { background: "rgba(139,92,246,0.15)", color: "#c084fc" }
                : { color: "rgba(255,255,255,0.82)" }}
              onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; } }}
              onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.82)"; } }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── Recientes label (shrink-0) ── */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <span className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
          Recientes
        </span>
      </div>

      {/* ── Scrollable project list (flex-1 min-h-0) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
        {isLoading ? (
          <div className="px-3 py-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Cargando...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-3 py-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            No hay proyectos recientes
          </div>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const isActive = pathname === `/app/generate/${project.id}`;
              return (
                <button
                  key={project.id}
                  onClick={() => handleNav(`/app/generate/${project.id}`)}
                  className="w-full text-left px-3 py-2 rounded-xl transition-all duration-150 flex items-center gap-1.5 min-w-0 cursor-pointer"
                  style={isActive
                    ? { background: "rgba(255,255,255,0.08)", color: "#fff" }
                    : { color: "rgba(255,255,255,0.72)" }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.72)"; } }}
                >
                  <span className="truncate flex-1 text-[13px] font-medium">{project.name}</span>
                  {isProjectGenerating(project.id) && (
                    <Loader2 className="w-3 h-3 shrink-0 animate-spin" style={{ color: "#8b5cf6" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer — always pinned at bottom (shrink-0) ── */}
      <div className="shrink-0 p-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {balance !== null && (
          <button
            onClick={() => handleNav("/app/billing")}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition-all duration-200 cursor-pointer"
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.18)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.1)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.2)";
            }}
          >
            <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: "#a78bfa" }} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm">${parseFloat(balance).toFixed(2)}</div>
              <div className="text-[10px] uppercase font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {planType}
              </div>
            </div>
          </button>
        )}
        <div
          className="flex items-center gap-1 rounded-xl"
          style={{ transition: "background 0.2s" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
        >
          <button
            onClick={() => handleNav("/app/profile")}
            className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 text-left cursor-pointer"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
                {user?.username || user?.email}
              </div>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={logout}
            className="shrink-0 mr-1"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
