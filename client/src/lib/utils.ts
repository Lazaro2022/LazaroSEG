import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  }).format(date);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function calculateDaysUntilDeadline(deadline: Date): number {
  const now = new Date();
  const diffTime = deadline.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isDocumentUrgent(deadline: Date, status: string): boolean {
  if (status === "Concluído") return false;
  
  const daysLeft = calculateDaysUntilDeadline(deadline);
  return daysLeft <= 2;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Concluído":
      return "text-green-500";
    case "Em Andamento":
      return "text-orange-500";
    case "Vencido":
      return "text-red-500";
    case "Urgente":
      return "text-red-500";
    default:
      return "text-gray-500";
  }
}

export function getDocumentTypeColor(type: string): string {
  switch (type) {
    case "Certidão":
      return "text-blue-500";
    case "Relatório":
      return "text-orange-500";
    case "Ofício":
      return "text-green-500";
    case "Extinção":
      return "text-purple-500";
    default:
      return "text-gray-500";
  }
}
