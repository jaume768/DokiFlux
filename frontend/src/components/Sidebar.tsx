"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import type { ProjectListItem, PaginatedResponse } from "@/types/auth";
import {
  Home,
  FolderOpen,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  LogOut,
  Coins,
  Plus,
  Loader2,
} from "lucide-react";
import { useActiveGenerations } from "@/context/ActiveGenerationsContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, balance, planType } = useAuth();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [showRecent, setShowRecent] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const { isActive: isProjectGenerating } = useActiveGenerations();

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiGet<PaginatedResponse<ProjectListItem>>("/projects/");
      setProjects(data.results.slice(0, 10)); // Solo últimos 10
    } catch {
      console.error("Error loading projects");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Reload projects when route changes (new project created)
  useEffect(() => {
    loadProjects();
  }, [pathname, loadProjects]);

  const navItems = [
    { icon: Home, label: "Inicio", path: "/app" },
    { icon: FolderOpen, label: "Proyectos", path: "/app/dashboard" },
    { icon: MessageSquare, label: "Chats", path: "/app/chats" },
  ];

  function handleNav(path: string) {
    router.push(path);
    onClose?.();
  }

  return (
    <div
      className={`
        w-[280px] h-screen border-r bg-background flex flex-col shrink-0
        fixed left-0 top-0 bottom-0 z-50 transition-transform duration-300
        md:relative md:z-auto md:translate-x-0 md:shadow-none
        ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={200} height={50} className="h-10 w-auto hidden dark:block" />
          <Image src="/logo-texto-negro.png" alt="DokiFlux" width={200} height={50} className="h-10 w-auto block dark:hidden" />
        </div>
        <Button
          onClick={() => handleNav("/app")}
          className="w-full justify-start gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo chat
        </Button>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 border-b">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Recent Projects */}
      <div className="flex-1 min-h-0 flex flex-col">
        <button
          onClick={() => setShowRecent(!showRecent)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showRecent ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          Chats recientes
        </button>

        {showRecent && (
          <ScrollArea className="flex-1 px-2">
            <div className="space-y-0.5 pb-4">
              {isLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Cargando...
                </div>
              ) : projects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No hay proyectos recientes
                </div>
              ) : (
                projects.map((project) => {
                  const isActive = pathname === `/app/generate/${project.id}`;
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleNav(`/app/generate/${project.id}`)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate flex-1">{project.name}</span>
                        {isProjectGenerating(project.id) && (
                          <Loader2 className="w-3 h-3 shrink-0 animate-spin text-blue-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-70">
                        <MessageSquare className="w-2.5 h-2.5" />
                        {project.message_count}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {balance !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
            <Coins className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">${parseFloat(balance).toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground uppercase">
                {planType}
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 rounded-lg hover:bg-muted transition-colors">
          <button
            onClick={() => handleNav("/app/profile")}
            className="flex items-center gap-2 px-3 py-2 flex-1 min-w-0 text-left"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
              {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {user?.username || user?.email}
              </div>
            </div>
          </button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={logout}
            className="shrink-0 mr-1"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
