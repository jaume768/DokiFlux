"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

export default function ChatsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: "#0a0a0f" }}>
      <div className="text-center space-y-5 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-2"
          style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}
        >
          <MessageSquare className="w-8 h-8" style={{ color: "#a78bfa" }} />
        </div>
        <h2 className="text-2xl font-bold text-white">Todos tus chats</h2>
        <p className="text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
          Tus proyectos y conversaciones aparecen en el sidebar. Selecciona uno para continuar o crea uno nuevo.
        </p>
        <button
          onClick={() => router.push("/app")}
          className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white"
        >
          Crear nuevo chat
        </button>
      </div>
    </div>
  );
}
