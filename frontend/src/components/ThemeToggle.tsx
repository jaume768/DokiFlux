"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        disabled
      >
        <Sun className="w-4 h-4" />
      </Button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    if (theme === "light") {
      return <Sun className="w-4 h-4" />;
    } else if (theme === "dark") {
      return <Moon className="w-4 h-4" />;
    } else {
      return <Monitor className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "System";
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={cycleTheme}
      className="shrink-0"
      title={`Current: ${getLabel()}. Click to cycle.`}
    >
      {getIcon()}
    </Button>
  );
}
