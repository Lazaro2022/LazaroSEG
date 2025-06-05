import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, CheckCircle, Edit, Archive, Save, X, Trash2, RotateCcw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DocumentWithUser, User } from "@shared/schema";
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
  "Arquivado": { 
    className: "bg-gray-500/20 text-gray-400 border-gray-500/30", 
    label: "Arquivado" 
  },
};

const typeConfig = {
  "Certidão": { className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  "Relatório": { className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  "Ofício": { className: "bg-green-500/20 text-green-400 border-green-500/30" },
  "Extinção": { className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const editFormSchema = z.object({
  processNumber: z.string().min(1, "Número do processo é obrigatório"),
  prisonerName: z.string().min(1, "Nome do interno é obrigatório"),
  type: z.string().min(1, "Tipo é obrigatório"),
  deadline: z.string().min(1, "Prazo é obrigatório"),
  status: z.string().min(1, "Status é obrigatório"),
  assignedTo: z.number().nullable(),
});

type EditFormData = z.infer<typeof editFormSchema>;

export function DocumentsTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingDocument, setEditingDocument] = useState<DocumentWithUser | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);

  const { data: documents, isLoading } = useQuery<DocumentWithUser[]>({
    queryKey: ["/api/documents?limit=10"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      processNumber: "",
      prisonerName: "",
      type: "",
      deadline: "",
      status: "",
      assignedTo: null,
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditFormData }) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          deadline: new Date(data.deadline),
        }),
      });
      if (!response.ok) throw new Error("Failed to update document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setEditDialogOpen(false);
      setEditingDocument(null);
      toast({
        title: "Documento atualizado",
        description: "O documento foi atualizado com sucesso.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}/archive`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to archive document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento arquivado",
        description: "O documento foi arquivado com sucesso.",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}/restore`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to restore document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento restaurado",
        description: "O documento foi restaurado com sucesso.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído permanentemente.",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Concluído",
          completedAt: new Date(),
        }),
      });
      if (!response.ok) throw new Error("Failed to complete document");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Documento concluído",
        description: "O documento foi marcado como concluído.",
      });
    },
  });

  const handleEdit = (document: DocumentWithUser) => {
    setEditingDocument(document);
    form.reset({
      processNumber: document.processNumber,
      prisonerName: document.prisonerName,
      type: document.type,
      deadline: format(new Date(document.deadline), "yyyy-MM-dd"),
      status: document.status,
      assignedTo: document.assignedTo,
    });
    setEditDialogOpen(true);
  };

  const onSubmit = (data: EditFormData) => {
    if (!editingDocument) return;
    editMutation.mutate({ id: editingDocument.id, data });
  };

  const handleArchive = (documentId: number) => {
    archiveMutation.mutate(documentId);
  };

  const handleRestore = (documentId: number) => {
    restoreMutation.mutate(documentId);
  };

  const handleDelete = (documentId: number) => {
    setDocumentToDelete(documentId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleComplete = (documentId: number) => {
    completeMutation.mutate(documentId);
  };

  if (isLoading) {
    return (
      <Card className="card-glass h-[400px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          Carregando documentos...
        </div>
      </Card>
    );
  }

  const activeDocuments = documents?.filter(doc => !doc.isArchived) || [];
  const archivedDocuments = documents?.filter(doc => doc.isArchived) || [];

  return (
    <div className="space-y-6">
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] card-glass">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Documento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="processNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Número do Processo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prisonerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Nome do Interno</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="glass-morphism-dark border-white/10">
                        <SelectItem value="Certidão">Certidão</SelectItem>
                        <SelectItem value="Relatório">Relatório</SelectItem>
                        <SelectItem value="Ofício">Ofício</SelectItem>
                        <SelectItem value="Extinção">Extinção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Prazo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date"
                        className="bg-white/10 border-white/20 text-white" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                        <SelectItem value="Vencido">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Responsável</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}>
                      <FormControl>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={editMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditDialogOpen(false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="card-glass">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja excluir este documento permanentemente? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDeleteConfirmOpen(false)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active Documents */}
      <Card className="card-glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Documentos Ativos
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {activeDocuments.length} documentos
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum documento ativo encontrado
            </div>
          ) : (
            activeDocuments.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">
                      {document.processNumber}
                    </span>
                    <Badge
                      className={typeConfig[document.type as keyof typeof typeConfig]?.className}
                    >
                      {document.type}
                    </Badge>
                    <Badge
                      className={statusConfig[document.status as keyof typeof statusConfig]?.className}
                    >
                      {document.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="font-medium">{document.prisonerName}</span>
                    <span className="mx-2">•</span>
                    <span>Prazo: {format(new Date(document.deadline), "dd/MM/yyyy", { locale: ptBR })}</span>
                    {document.assignedUser && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Responsável: {document.assignedUser.name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {document.status !== "Concluído" && (
                    <Button
                      size="sm"
                      onClick={() => handleComplete(document.id)}
                      disabled={completeMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(document)}
                    disabled={editMutation.isPending}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchive(document.id)}
                    disabled={archiveMutation.isPending}
                    className="text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/10"
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(document.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Archived Documents */}
      {archivedDocuments.length > 0 && (
        <Card className="card-glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Documentos Arquivados
            </CardTitle>
            <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
              {archivedDocuments.length} documentos
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {archivedDocuments.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 opacity-75"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">
                      {document.processNumber}
                    </span>
                    <Badge
                      className={typeConfig[document.type as keyof typeof typeConfig]?.className}
                    >
                      {document.type}
                    </Badge>
                    <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                      Arquivado
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">
                    <span className="font-medium">{document.prisonerName}</span>
                    <span className="mx-2">•</span>
                    <span>Arquivado em: {document.archivedAt ? format(new Date(document.archivedAt), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(document.id)}
                    disabled={restoreMutation.isPending}
                    className="text-blue-400 border-blue-400/20 hover:bg-blue-400/10"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(document.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}