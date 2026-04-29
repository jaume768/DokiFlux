"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, Phone, Mail, Building2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface ConsultationModalProps {
  open: boolean;
  onClose: () => void;
  source?: "footer" | "pricing" | "hero";
}

export function ConsultationModal({ open, onClose, source = "footer" }: ConsultationModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/contact/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          project_name: company.trim(),
          message: `[Consulta desde ${source}]\n\n${message.trim()}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No se pudo enviar la solicitud.");
      }
      setSuccess(true);
    } catch (err) {
      const e = err as Error;
      setError(e.message || "Error al enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-10 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full rounded-2xl p-6 sm:p-8 my-auto"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, #0b0b14 70%)",
          border: "2px solid rgba(139,92,246,0.55)",
          boxShadow:
            "0 0 0 1px rgba(139,92,246,0.18), 0 30px 80px -20px rgba(139,92,246,0.5), 0 0 100px -20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-4">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: "rgba(52,211,153,0.15)" }}
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Solicitud enviada!</h2>
            <p className="text-white/70 mb-6">
              Nos pondremos en contacto contigo en menos de 24h laborables al email que nos has indicado.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Agenda una consultoría</h2>
            <p className="text-sm text-white/60 mb-6">
              Cuéntanos tu caso y te contactamos. Sin compromiso · 30 min · Gratis.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Nombre *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={sending}
                  placeholder="Tu nombre"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/60 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sending}
                    placeholder="tu@empresa.com"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={sending}
                    placeholder="+34 600…"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Empresa / Proyecto
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={sending}
                  placeholder="Tu empresa"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 mb-1 block">¿Qué necesitas?</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sending}
                  rows={4}
                  placeholder="Cuéntanos brevemente qué quieres construir, en qué plazo, y cualquier detalle relevante…"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/60 resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" }}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </button>

              <p className="text-[10px] text-white/40 text-center pt-1">
                Al enviar aceptas que tratemos tus datos para contactarte sobre esta consulta.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
