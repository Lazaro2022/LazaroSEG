import { useState } from "react";
import { Search, Clock, User, Edit3, LogOut, Settings } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { DocumentWithUser } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Header() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, logout, isAdmin } = useAuth();

  const { data: nextDeadlineData } = useQuery<{deadline: string}>({
    queryKey: ["/api/dashboard/next-deadline"],
  });

  const { data: documents } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  const { data: systemSettings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const updateAdminMutation = useMutation({
    mutationFn: async (name: string) => {
      const updatedSettings = {
        system_name: systemSettings?.system_name || "Lazarus CG - Sistema de Controle",
        institution: systemSettings?.institution || "Unidade Prisional - Manaus/AM",
        admin_name: name,
        timezone: systemSettings?.timezone || "america/manaus",
        language: systemSettings?.language || "pt-br",
        urgent_days: systemSettings?.urgent_days || 2,
        warning_days: systemSettings?.warning_days || 7,
        auto_archive: systemSettings?.auto_archive || true,
      };
      
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Nome atualizado",
        description: "Nome do administrador foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar nome do administrador.",
        variant: "destructive",
      });
    },
  });

  const targetDate = nextDeadlineData?.deadline ? new Date(nextDeadlineData.deadline) : null;
  const { timeLeft } = useCountdown(targetDate);

  // Filter documents based on search term
  const filteredDocuments = documents?.filter(doc => 
    searchTerm.length >= 2 && (
      doc.processNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.prisonerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).slice(0, 5) || [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSearchResults(value.length >= 2);
  };

  const handleDocumentClick = (documentId: number) => {
    setShowSearchResults(false);
    setSearchTerm("");
    setLocation("/documents");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Concluído": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "Em Andamento": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Vencido": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "Urgente": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <header className="glass-morphism border-b border-white/10 p-3 md:p-6">
      <div className="flex items-center justify-between gap-2 md:gap-4">
        {/* System Title */}
        <div className="flex items-center space-x-3">
          <div className="text-white">
            <h1 className="text-lg font-semibold">Sistema de Controle</h1>
            <p className="text-xs text-gray-400">Prazos e Produtividade</p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-4">
          {/* Countdown Timer */}
          <div className="hidden sm:flex items-center space-x-2 bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-2">
            <Clock className="text-red-400 w-4 h-4 animate-pulse" />
            <div className="text-xs">
              <div className="font-medium text-[#ebebf5]">Próximo Prazo</div>
              <div className="text-white font-bold">
                {timeLeft || "Sem prazos"}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-white">
              {user?.name}
            </div>
            <div className="text-xs text-gray-400">
              {isAdmin ? "Administrador" : "Usuário"}
            </div>
          </div>
          
          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-600 text-white">
                    {user?.initials || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 glass-morphism-dark border-white/10" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-white">{user?.name}</p>
                  <p className="w-[200px] truncate text-sm text-gray-400">
                    @{user?.username}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={() => setLocation("/settings")}
                className="text-gray-300 hover:text-white hover:bg-white/10"
              >
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
