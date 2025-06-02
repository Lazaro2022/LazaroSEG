import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Edit, Archive } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DocumentWithUser } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  "Em Andamento": { 
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30", 
    label: "Em Andamento" 
  },
  "Concluído": { 
    className: "bg-green-500/20 text-green-400 border-green-500/30", 
    label: "Concluído" 
  },
  "Vencido": { 
    className: "status-urgent", 
    label: "Vencido" 
  },
  "Urgente": { 
    className: "status-urgent", 
    label: "Urgente" 
  },
};

const typeConfig = {
  "Certidão": { className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "Relatório": { className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  "Ofício": { className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export function DocumentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: documents, isLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents?limit=10"],
  });

  const completeMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("PATCH", `/api/documents/${documentId}`, {
        status: "Concluído"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Documento concluído",
        description: "O documento foi marcado como concluído com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível concluir o documento.",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Documento arquivado",
        description: "O documento foi arquivado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível arquivar o documento.",
        variant: "destructive",
      });
    },
  });

  const handleComplete = (documentId: number) => {
    completeMutation.mutate(documentId);
  };

  const handleEdit = (documentId: number) => {
    toast({
      title: "Função em desenvolvimento",
      description: "A funcionalidade de edição será implementada em breve.",
    });
  };

  const handleArchive = (documentId: number) => {
    archiveMutation.mutate(documentId);
  };

  if (isLoading) {
    return (
      <Card className="glass-morphism">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-morphism">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Documentos Recentes</CardTitle>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => toast({
              title: "Função em desenvolvimento",
              description: "A funcionalidade de novo documento será implementada em breve.",
            })}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 font-medium text-gray-300">Nº Processo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Apenado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Tipo</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Prazo Final</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents?.map((document) => {
                const now = new Date();
                const deadline = new Date(document.deadline);
                const isUrgent = deadline <= new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)) && document.status !== "Concluído";
                const displayStatus = isUrgent && document.status === "Em Andamento" ? "Urgente" : document.status;
                
                return (
                  <tr 
                    key={document.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <span className="font-mono text-blue-400">
                        {document.processNumber}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white">
                      {document.prisonerName}
                    </td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant="outline" 
                        className={`${typeConfig[document.type as keyof typeof typeConfig]?.className} border text-xs`}
                      >
                        {document.type}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-white">
                      {format(deadline, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant="outline" 
                        className={`${statusConfig[displayStatus as keyof typeof statusConfig]?.className} border text-xs font-medium`}
                      >
                        {statusConfig[displayStatus as keyof typeof statusConfig]?.label}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        {document.status !== "Concluído" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="pill-button bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 text-xs px-3 py-1"
                            onClick={() => handleComplete(document.id)}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Concluir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="pill-button bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30 text-xs px-3 py-1"
                          onClick={() => handleEdit(document.id)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="pill-button bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 text-xs px-3 py-1"
                          onClick={() => handleArchive(document.id)}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="w-3 h-3 mr-1" />
                          Arquivar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
