"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import type { ProjectListItem, PaginatedResponse } from "@/types/auth";
import {
  Plus,
  Loader2,
  Trash2,
  FolderOpen,
  MessageSquare,
  Clock,
  Menu,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useMobileSidebar } from "@/context/MobileSidebarContext";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function DashboardPage() {
  const { logout } = useAuth();
  const { toggle: toggleSidebar } = useMobileSidebar();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiGet<PaginatedResponse<ProjectListItem>>("/projects/");
      setProjects(data.results);
    } catch {
      setError("Error al cargar proyectos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    setError("");

    try {
      const project = await apiPost<ProjectListItem>("/projects/", {
        name: newName.trim(),
        description: newDesc.trim(),
      });
      router.push(`/app/generate/${project.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error al crear proyecto.");
      }
      setIsCreating(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await apiDelete(`/projects/${id}/`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch {
      setError("Error al eliminar proyecto.");
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="text-white/60 hover:text-white">
          <Menu className="w-5 h-5" />
        </Button>
        <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={140} height={35} className="h-7 w-auto" />
        <div className="w-8" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Mis Proyectos</h2>
              <p className="text-base mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              disabled={showNewForm}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Plus className="w-4 h-4" />
              Nuevo proyecto
            </button>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          {/* New project form */}
          {showNewForm && (
            <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <h3 className="text-base font-semibold text-white mb-4">Nuevo proyecto</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">Nombre del proyecto</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Mi app increíble"
                    autoFocus
                    required
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/70">
                    Descripción <span className="font-normal" style={{ color: "rgba(255,255,255,0.35)" }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Breve descripción del proyecto"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/50 hover:text-white"
                    onClick={() => { setShowNewForm(false); setNewName(""); setNewDesc(""); }}
                  >
                    Cancelar
                  </Button>
                  <button type="submit" disabled={isCreating || !newName.trim()}
                    className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" />Creando...</> : <><Plus className="w-4 h-4" />Crear y abrir</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#8b5cf6" }} />
            </div>
          )}

          {/* Empty state */}
          {!isLoading && projects.length === 0 && !showNewForm && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <FolderOpen className="w-8 h-8" style={{ color: "#a78bfa" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No tienes proyectos</h3>
              <p className="text-base mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                Crea tu primer proyecto para empezar a generar UI con IA
              </p>
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              >
                <Plus className="w-4 h-4" />
                Crear primer proyecto
              </button>
            </div>
          )}

          {/* Project grid */}
          {!isLoading && projects.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="group cursor-pointer rounded-2xl p-5 transition-all duration-300"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => router.push(`/app/generate/${project.id}`)}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(139,92,246,0.3)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 24px rgba(139,92,246,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                >
                  <h3 className="font-semibold text-white text-base truncate mb-1">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm line-clamp-2 mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>{project.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {project.message_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(project.updated_at)}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {deleteId === project.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="xs" onClick={() => handleDelete(project.id)}>
                            Eliminar
                          </Button>
                          <Button variant="ghost" size="xs" className="text-white/50" onClick={() => setDeleteId(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white"
                          onClick={() => setDeleteId(project.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
