"use client";

import { useRouter } from "next/navigation";
import type { Template } from "@/lib/templates";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface TemplateCardProps {
  template: Template;
  onClick?: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const router = useRouter();

  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }
    router.push(`/register?template=${template.id}`);
  }

  return (
    <Card
      className="group cursor-pointer transition-all hover:ring-2 hover:ring-primary/20 hover:shadow-md"
      onClick={handleClick}
    >
      {/* Emoji visual */}
      <div className="flex h-32 items-center justify-center bg-muted/50 text-5xl rounded-t-xl">
        {template.emoji}
      </div>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{template.category}</Badge>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <CardTitle className="text-base">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
