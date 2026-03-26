"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-2">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Todos tus chats</h2>
        <p className="text-muted-foreground">
          Tus proyectos y conversaciones aparecen en el sidebar. Selecciona uno para continuar o crea uno nuevo.
        </p>
        <Button onClick={() => router.push("/app")} size="lg">
          Crear nuevo chat
        </Button>
      </div>
    </div>
  );
}
