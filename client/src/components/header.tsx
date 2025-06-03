import { useState } from "react";
import { Search, Clock, User, Edit3 } from "lucide-react";
import { useCountdown } from "@/hooks/use-countdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
    <header className="glass-morphism border-b border-white/10 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        
        {/* User Info & Countdown */}
        <div className="flex items-center space-x-6">

          
          {/* User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div className="text-sm font-medium">
                  {systemSettings?.admin_name || "Lazarus"}
                </div>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      onClick={() => {
                        setAdminName(systemSettings?.admin_name || "Lazarus");
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-morphism-dark border-white/10 max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Editar Nome do Administrador</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="adminName">Nome do Administrador</Label>
                        <Input
                          id="adminName"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          className="bg-gray-800/50 border-gray-600/30"
                          placeholder="Digite o nome do administrador"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsEditDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => updateAdminMutation.mutate(adminName)}
                          disabled={updateAdminMutation.isPending || !adminName.trim()}
                        >
                          {updateAdminMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-xs text-gray-400">Administrador</div>
            </div>
            <Avatar className="w-10 h-10 border-2 border-[hsl(var(--neon-turquoise))]">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {(systemSettings?.admin_name || "Lazarus").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
