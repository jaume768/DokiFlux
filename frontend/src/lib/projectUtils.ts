export function generateProjectTitle(prompt: string): string {
  if (!prompt.trim()) return "Nuevo Proyecto";
  
  // Obtener las primeras palabras significativas
  const words = prompt.trim().split(/\s+/).slice(0, 8).join(" ");
  
  // Limitar a 60 caracteres
  if (words.length > 60) {
    return words.slice(0, 60).trim() + "...";
  }
  
  return words;
}
