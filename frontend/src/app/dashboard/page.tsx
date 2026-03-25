"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import type { ProjectListItem, PaginatedResponse } from "@/types/auth";
import {
  Sparkles,
  Plus,
  Loader2,
  Trash2,
  FolderOpen,
  MessageSquare,
  LogOut,
  Coins,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

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
  const { user, logout, balance, planType } = useAuth();
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
      router.push(`/generate/${project.id}`);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">Dokiflux</h1>
          </div>

          <div className="flex items-center gap-3">
            {balance !== null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <Coins className="w-3.5 h-3.5" />
                <span>${parseFloat(balance).toFixed(2)}</span>
                <span className="text-[10px] uppercase font-medium ml-1 px-1.5 py-0.5 rounded bg-background">
                  {planType}
                </span>
              </div>
            )}
            <div className="text-xs text-muted-foreground hidden sm:block">
              {user?.username || user?.email}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Mis Proyectos</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length} proyecto{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* New project form */}
        {showNewForm && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nombre del proyecto</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Mi app increíble"
                    autoFocus
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Breve descripción del proyecto"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewName("");
                      setNewDesc("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || !newName.trim()}>
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Crear y abrir
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && projects.length === 0 && !showNewForm && (
          <div className="text-center py-20">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-1">No tienes proyectos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primer proyecto para empezar a generar UI con IA
            </p>
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="w-4 h-4" />
              Crear primer proyecto
            </Button>
          </div>
        )}

        {/* Project grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                onClick={() => router.push(`/generate/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="truncate">{project.name}</CardTitle>
                  {project.description && (
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {project.message_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(project.updated_at)}
                    </span>
                  </div>

                  {/* Delete button */}
                  <div onClick={(e) => e.stopPropagation()}>
                    {deleteId === project.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => handleDelete(project.id)}
                        >
                          Eliminar
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeleteId(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
