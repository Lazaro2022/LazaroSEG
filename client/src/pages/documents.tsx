import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CheckCircle, Edit, Archive, CalendarIcon, Search, RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema, type DocumentWithUser, type User } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { z } from "zod";

const documentFormSchema = insertDocumentSchema.extend({
  deadline: z.date(),
});

type DocumentFormData = z.infer<typeof documentFormSchema>;

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

export default function DocumentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDocumentOpen, setIsNewDocumentOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentWithUser | null>(null);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);

  const { data: documents, isLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const archivedDocumentsQuery = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents/archived"],
    enabled: isArchivedOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      return apiRequest("POST", "/api/documents", {
        ...data,
        deadline: data.deadline.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setIsNewDocumentOpen(false);
      form.reset();
      toast({
        title: "Documento criado",
        description: "O documento foi criado com sucesso.",
      });
    },
    onError: (error: any) => {
      console.log("Erro ao criar documento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o documento. Verifique os dados informados.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DocumentFormData> }) => {
      const payload = data.deadline 
        ? { ...data, deadline: data.deadline.toISOString() }
        : data;
      return apiRequest("PATCH", `/api/documents/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setEditingDocument(null);
      toast({
        title: "Documento atualizado",
        description: "O documento foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o documento.",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("PATCH", `/api/documents/${documentId}`, {
        status: "Concluído",
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Documento concluído",
        description: "O documento foi marcado como concluído com sucesso.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/documents/${id}/archive`, {});
    },
    onSuccess: () => {
      toast({
        title: "Documento arquivado",
        description: "O documento foi arquivado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao arquivar o documento.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/documents/${id}/restore`, {});
    },
    onSuccess: () => {
      toast({
        title: "Documento restaurado",
        description: "O documento foi restaurado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao restaurar o documento.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/documents/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído permanentemente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/archived"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao excluir o documento.",
        variant: "destructive",
      });
    },
  });

  const handleRestoreDocument = (id: number) => {
    restoreMutation.mutate(id);
  };

  const handleArchiveDocument = (id: number) => {
    archiveMutation.mutate(id);
  };

  const handleDelete = (documentId: number) => {
    setDocumentToDelete(documentId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  const onSubmit = (data: DocumentFormData) => {
    createMutation.mutate(data);
  };

  const editForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
  });

  const handleEdit = (document: DocumentWithUser) => {
    setEditingDocument(document);
    editForm.reset({
      processNumber: document.processNumber,
      prisonerName: document.prisonerName,
      type: document.type as any,
      status: document.status as any,
      assignedTo: document.assignedTo || 2,
      deadline: new Date(document.deadline),
    });
  };

  const onEditSubmit = (data: DocumentFormData) => {
    if (editingDocument) {
      updateMutation.mutate({ 
        id: editingDocument.id, 
        data: {
          ...data,
          deadline: data.deadline,
        }
      });
    }
  };

  const filteredDocuments = documents?.filter(doc => {
    if (!searchTerm) return true;
    return (
      doc.processNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.prisonerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) || [];

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      processNumber: "",
      prisonerName: "",
      type: "Certidão",
      status: "Em Andamento",
      assignedTo: 2,
      deadline: new Date(),
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="container mx-auto max-w-7xl">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando documentos...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="container mx-auto max-w-7xl space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Gerenciamento de Documentos</h1>
                <p className="text-gray-400">Controle e acompanhamento de processos administrativos</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => setIsArchivedOpen(true)}
                  variant="outline"
                  className="bg-purple-600/20 text-purple-400 border-purple-600/30 hover:bg-purple-600/30"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Nos Autos
                </Button>
                
                <Dialog open={isNewDocumentOpen} onOpenChange={setIsNewDocumentOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Documento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-morphism-dark border-white/10 max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold">Criar Novo Documento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div>
                        <Label>Número do Processo</Label>
                        <Input
                          {...form.register("processNumber")}
                          placeholder="Ex: 2024.001.0001"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                      
                      <div>
                        <Label>Nome do Apenado</Label>
                        <Input
                          {...form.register("prisonerName")}
                          placeholder="Nome completo"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                      
                      <div>
                        <Label>Tipo de Documento</Label>
                        <Select 
                          value={form.watch("type")} 
                          onValueChange={(value) => form.setValue("type", value as any)}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Certidão">Certidão</SelectItem>
                            <SelectItem value="Relatório">Relatório</SelectItem>
                            <SelectItem value="Ofício">Ofício</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Responsável</Label>
                        <Select 
                          value={form.watch("assignedTo")?.toString()} 
                          onValueChange={(value) => form.setValue("assignedTo", parseInt(value))}
                        >
                          <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Prazo Final</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal bg-gray-800/50 border-gray-600/30",
                                !form.watch("deadline") && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {form.watch("deadline") ? format(form.watch("deadline"), "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 glass-morphism-dark border-white/10">
                            <Calendar
                              mode="single"
                              selected={form.watch("deadline")}
                              onSelect={(date) => date && form.setValue("deadline", date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setIsNewDocumentOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          disabled={createMutation.isPending}
                        >
                          Criar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Search and Filter */}
            <Card className="glass-morphism">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por processo, apenado ou tipo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800/50 border-gray-600/30"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Table */}
            <Card className="glass-morphism">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">
                  Todos os Documentos ({filteredDocuments?.length || 0})
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Nº Processo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Apenado</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Tipo</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Responsável</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Prazo Final</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-300">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((document) => {
                        const now = new Date();
                        const deadline = new Date(document.deadline);
                        const isOverdue = deadline < now && document.status !== "Concluído";
                        const isUrgent = deadline <= new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)) && document.status !== "Concluído" && !isOverdue;
                        
                        let displayStatus = document.status;
                        if (isOverdue) {
                          displayStatus = "Vencido";
                        } else if (isUrgent && document.status === "Em Andamento") {
                          displayStatus = "Urgente";
                        }
                        
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
                            <td className="py-4 px-4 text-gray-300">
                              {document.assignedUser?.name || "Não atribuído"}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {format(new Date(document.deadline), "dd/MM/yyyy", { locale: ptBR })}
                            </td>
                            <td className="py-4 px-4">
                              <Badge 
                                variant="outline" 
                                className={`${statusConfig[displayStatus as keyof typeof statusConfig]?.className} border text-xs`}
                              >
                                {displayStatus}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                {document.status === "Em Andamento" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="pill-button bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30 text-xs px-3 py-1"
                                    onClick={() => completeMutation.mutate(document.id)}
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
                                  onClick={() => handleEdit(document)}
                                >
                                  <Edit className="w-3 h-3 mr-1" />
                                  Editar
                                </Button>
                                {document.status === "Concluído" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="pill-button bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30 text-xs px-3 py-1"
                                    onClick={() => handleArchiveDocument(document.id)}
                                    disabled={archiveMutation.isPending}
                                  >
                                    <Archive className="w-3 h-3 mr-1" />
                                    Arquivar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="pill-button bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 text-xs px-3 py-1"
                                  onClick={() => handleDelete(document.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Excluir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      {searchTerm ? "Nenhum documento encontrado com os critérios de busca." : "Nenhum documento encontrado."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Edit Document Dialog */}
            <Dialog open={!!editingDocument} onOpenChange={(open) => !open && setEditingDocument(null)}>
              <DialogContent className="glass-morphism-dark border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Editar Documento</DialogTitle>
                </DialogHeader>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <div>
                    <Label>Número do Processo</Label>
                    <Input
                      {...editForm.register("processNumber")}
                      placeholder="Ex: 2024.001.0001"
                      className="bg-gray-800/50 border-gray-600/30"
                    />
                  </div>
                  
                  <div>
                    <Label>Nome do Apenado</Label>
                    <Input
                      {...editForm.register("prisonerName")}
                      placeholder="Nome completo"
                      className="bg-gray-800/50 border-gray-600/30"
                    />
                  </div>
                  
                  <div>
                    <Label>Tipo de Documento</Label>
                    <Select 
                      value={editForm.watch("type")} 
                      onValueChange={(value) => editForm.setValue("type", value as any)}
                    >
                      <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Certidão">Certidão</SelectItem>
                        <SelectItem value="Relatório">Relatório</SelectItem>
                        <SelectItem value="Ofício">Ofício</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Status</Label>
                    <Select 
                      value={editForm.watch("status")} 
                      onValueChange={(value) => editForm.setValue("status", value as any)}
                    >
                      <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Responsável</Label>
                    <Select 
                      value={editForm.watch("assignedTo")?.toString()} 
                      onValueChange={(value) => editForm.setValue("assignedTo", parseInt(value))}
                    >
                      <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Prazo Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-gray-800/50 border-gray-600/30",
                            !editForm.watch("deadline") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editForm.watch("deadline") ? format(editForm.watch("deadline"), "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 glass-morphism-dark border-white/10">
                        <Calendar
                          mode="single"
                          selected={editForm.watch("deadline")}
                          onSelect={(date) => date && editForm.setValue("deadline", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingDocument(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={updateMutation.isPending}
                    >
                      Salvar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Archived Documents Dialog */}
            <Dialog open={isArchivedOpen} onOpenChange={setIsArchivedOpen}>
              <DialogContent className="glass-morphism-dark border-white/10 max-w-4xl">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl font-semibold">Nos Autos - Documentos Arquivados</DialogTitle>
                      <p className="text-gray-400 text-sm">
                        Documentos que foram lidos e juntados no processo
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsArchivedOpen(false);
                      }}
                      className="bg-gray-700/50 hover:bg-gray-600/50 text-white border-gray-600 hover:text-white"
                    >
                      Voltar ao Menu
                    </Button>
                  </div>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto">
                  {archivedDocumentsQuery.isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                      <p className="text-gray-400 mt-2">Carregando documentos arquivados...</p>
                    </div>
                  ) : archivedDocumentsQuery.data && archivedDocumentsQuery.data.length > 0 ? (
                    <div className="space-y-3">
                      {archivedDocumentsQuery.data.map((doc: DocumentWithUser) => (
                        <div key={doc.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-600/30">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="font-mono text-blue-400 text-sm font-medium">
                                  {doc.processNumber}
                                </span>
                                <Badge className="bg-gray-600/30 text-gray-300 border-gray-500/30">
                                  {doc.type}
                                </Badge>
                                <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                                  Arquivado
                                </Badge>
                              </div>
                              <p className="text-white font-medium">{doc.prisonerName}</p>
                              <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                                <span>Arquivado em: {format(new Date(doc.archivedAt || doc.completedAt || doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                {doc.assignedUser && (
                                  <span>Responsável: {doc.assignedUser.name}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRestoreDocument(doc.id)}
                              className="bg-blue-600/20 text-blue-400 border-blue-600/30 hover:bg-blue-600/30"
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Restaurar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Archive className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-400">Nenhum documento arquivado encontrado</p>
                      <p className="text-gray-500 text-sm">Os documentos arquivados aparecerão aqui quando você arquivar documentos concluídos</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}