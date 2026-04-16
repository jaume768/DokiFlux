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
  AlertTriangle,
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
  const [isDeleting, setIsDeleting] = useState(false);
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
    setIsDeleting(true);
    try {
      await apiDelete(`/projects/${id}/`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
    } catch {
      setError("Error al eliminar proyecto.");
    } finally {
      setIsDeleting(false);
    }
  }

  const projectToDelete = projects.find((p) => p.id === deleteId);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ background: "#0a0a0f" }}>
      {/* Mobile topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} className="text-white/60 hover:text-white">
          <Menu className="w-5 h-5" />
        </Button>
        <button onClick={() => router.push("/app")} aria-label="Ir a inicio" className="flex items-center">
          <Image src="/logo-texto-blanco.png" alt="DokiFlux" width={140} height={35} className="h-7 w-auto" />
        </button>
        <div className="w-8" />
      </header>

      {/* Delete confirmation modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteId(null)}
          />
          <div
            className="relative z-10 rounded-2xl p-6 w-full max-w-sm"
            style={{
              background: "linear-gradient(135deg, #0f0f1a 0%, #12101e 100%)",
              border: "1px solid rgba(139,92,246,0.2)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.08)",
            }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-1">¿Eliminar proyecto?</h3>
            <p className="text-sm text-center mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              Esta acción no se puede deshacer.
            </p>
            {projectToDelete && (
              <p className="text-sm text-center font-medium mb-6" style={{ color: "rgba(167,139,250,0.9)" }}>
                &ldquo;{projectToDelete.name}&rdquo;
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "rgba(239,68,68,0.85)", border: "1px solid rgba(239,68,68,0.4)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.85)"; }}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.18)" }}>
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
                  className="group cursor-pointer rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.03) 100%)",
                    border: "1px solid rgba(139,92,246,0.15)",
                  }}
                  onClick={() => router.push(`/app/generate/${project.id}`)}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(139,92,246,0.4)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 28px rgba(139,92,246,0.13)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(139,92,246,0.15)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="h-[2px] w-full shrink-0"
                    style={{ background: "linear-gradient(90deg, #8b5cf6 0%, #6366f1 100%)", opacity: 0.5 }}
                  />

                  <div className="p-5 flex flex-col flex-1">
                    {/* Header row: title + delete */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-white text-base leading-snug flex-1 min-w-0"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {project.name}
                      </h3>
                      <button
                        className="shrink-0 p-1.5 -mr-1 -mt-0.5 rounded-lg transition-all duration-150"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                        onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                        title="Eliminar proyecto"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)";
                          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {project.description && (
                      <p className="text-sm line-clamp-2 flex-1 mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {project.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div
                      className="flex items-center gap-3 text-xs mt-auto pt-3"
                      style={{ borderTop: "1px solid rgba(139,92,246,0.1)", color: "rgba(255,255,255,0.38)" }}
                    >
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" style={{ color: "#8b5cf6", opacity: 0.7 }} />
                        {project.message_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: "#6366f1", opacity: 0.7 }} />
                        {timeAgo(project.updated_at)}
                      </span>
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
