"use client";

import { useEffect, useState } from "react";
import { X, Send, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  user: { email: string; full_name?: string } | null;
  project?: { id: number; name?: string } | null;
}

export function ContactModal({ open, onClose, user, project }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setName(user?.full_name || "");
    setEmail(user?.email || "");
    setPhone("");
    setSent(false);
    setError("");

    setMessage("");
  }, [open, user, project]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || sent) return;
    setSending(true);
    setError("");
    try {
      await apiPost("/contact/", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        project: project?.id ?? null,
        project_name: project?.name ?? "",
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar. Intenta de nuevo.";
      setError(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center sm:p-4 overflow-y-auto overscroll-contain">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative z-10 my-auto w-full max-w-lg min-h-full sm:min-h-0 sm:rounded-2xl border border-border bg-background shadow-2xl animate-in zoom-in-95 fade-in duration-200 flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 sm:px-7 py-6 sm:py-7">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold">¡Solicitud enviada!</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Nuestro equipo revisará tu proyecto y te enviaremos un presupuesto personalizado en menos de 24 horas.
              </p>
              <Button onClick={onClose} className="mt-2 w-full sm:w-auto">
                Entendido
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
                  Solicita tu presupuesto gratis
                </h2>
                <p className="text-sm text-muted-foreground">
                  Revisamos tu proyecto y te contactamos en 24h. Sin compromiso.
                </p>
              </div>

              <div className="grid gap-3">
                <Field label="Nombre" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background"
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background"
                  />
                </Field>

                <Field label="Teléfono (opcional)">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background"
                  />
                </Field>

                <Field label="¿Cuéntanos más?">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Cuéntanos qué quieres conseguir…"
                    className="w-full resize-none rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-primary focus:bg-background"
                  />
                </Field>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 mt-1">
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full gap-2 h-11 text-base font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
                  }}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar solicitud
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
                  Cancelar
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Al enviar aceptas que nuestro equipo se ponga en contacto contigo.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
