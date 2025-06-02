import { Search, Clock, User } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";

export function Header() {
  const { data: nextDeadlineData } = useQuery({
    queryKey: ["/api/dashboard/next-deadline"],
  });

  const targetDate = nextDeadlineData?.deadline ? new Date(nextDeadlineData.deadline) : null;
  const { timeLeft } = useCountdown(targetDate);

  return (
    <header className="glass-morphism border-b border-white/10 p-6">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-lg relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar documentos, processos ou apenados..."
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border-gray-600/30 rounded-lg focus:border-[hsl(var(--neon-turquoise))] focus:ring-2 focus:ring-[hsl(var(--neon-turquoise))]/20 text-white placeholder-gray-400"
          />
        </div>
        
        {/* User Info & Countdown */}
        <div className="flex items-center space-x-6">
          {/* Countdown Timer */}
          <div className="flex items-center space-x-3 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2">
            <Clock className="text-red-400 w-5 h-5 animate-pulse" />
            <div className="text-sm">
              <div className="text-red-400 font-medium">Próximo Prazo</div>
              <div className="text-white font-bold neon-text">
                {timeLeft || "Carregando..."}
              </div>
            </div>
          </div>
          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium">Dr. Carlos Silva</div>
              <div className="text-xs text-gray-400">Administrador</div>
            </div>
            <Avatar className="w-10 h-10 border-2 border-[hsl(var(--neon-turquoise))]">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                CS
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
