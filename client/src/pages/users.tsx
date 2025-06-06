import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Edit, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";

const userSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["admin", "user"], { required_error: "Selecione um papel" }),
});

const editUserSchema = userSchema.extend({
  password: z.string().optional(),
}).refine((data) => {
  if (data.password === "") return true;
  return !data.password || data.password.length >= 6;
}, {
  message: "Senha deve ter pelo menos 6 caracteres",
  path: ["password"],
});

type UserFormData = z.infer<typeof userSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "user",
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest("POST", "/api/users", data);
    },
    onSuccess: () => {
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi adicionado ao sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<EditUserFormData> }) => {
      const { password, ...updates } = data.updates;
      const payload = password && password.trim() ? data.updates : updates;
      return apiRequest("PUT", `/api/users/${data.id}`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso",
        description: "As informações do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Usuário removido com sucesso",
        description: "O usuário foi removido do sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      username: user.username,
      name: user.name,
      role: user.role as "admin" | "user",
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    if (confirm(`Tem certeza que deseja remover o usuário "${user.name}"?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const onCreateSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (!editingUser) return;
    updateUserMutation.mutate({ id: editingUser.id, updates: data });
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="glass-morphism-dark border-white/10">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Acesso Negado</h3>
              <p className="text-gray-400">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Gerenciar Usuários</h1>
          <p className="text-gray-400 mt-2">
            Gerencie os usuários do sistema e suas permissões
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-morphism-dark border-white/10">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="create-name">Nome Completo</Label>
                <Input
                  id="create-name"
                  {...createForm.register("name")}
                  className="bg-gray-800/50 border-gray-600/30"
                  placeholder="Digite o nome completo"
                />
                {createForm.formState.errors.name && (
                  <p className="text-red-400 text-sm mt-1">{createForm.formState.errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create-username">Username</Label>
                <Input
                  id="create-username"
                  {...createForm.register("username")}
                  className="bg-gray-800/50 border-gray-600/30"
                  placeholder="Digite o username"
                />
                {createForm.formState.errors.username && (
                  <p className="text-red-400 text-sm mt-1">{createForm.formState.errors.username.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create-password">Senha</Label>
                <Input
                  id="create-password"
                  type="password"
                  {...createForm.register("password")}
                  className="bg-gray-800/50 border-gray-600/30"
                  placeholder="Digite a senha"
                />
                {createForm.formState.errors.password && (
                  <p className="text-red-400 text-sm mt-1">{createForm.formState.errors.password.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="create-role">Papel</Label>
                <Select 
                  value={createForm.watch("role")} 
                  onValueChange={(value) => createForm.setValue("role", value as "admin" | "user")}
                >
                  <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                    <SelectValue placeholder="Selecione o papel" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism-dark border-white/10">
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {createForm.formState.errors.role && (
                  <p className="text-red-400 text-sm mt-1">{createForm.formState.errors.role.message}</p>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-morphism-dark border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-300">Nome</TableHead>
                  <TableHead className="text-gray-300">Username</TableHead>
                  <TableHead className="text-gray-300">Papel</TableHead>
                  <TableHead className="text-gray-300">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white">{user.name}</TableCell>
                    <TableCell className="text-gray-300">@{user.username}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={user.role === "admin" ? "bg-blue-600" : "bg-gray-600"}
                      >
                        {user.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-morphism-dark border-white/10">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                {...editForm.register("name")}
                className="bg-gray-800/50 border-gray-600/30"
                placeholder="Digite o nome completo"
              />
              {editForm.formState.errors.name && (
                <p className="text-red-400 text-sm mt-1">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                {...editForm.register("username")}
                className="bg-gray-800/50 border-gray-600/30"
                placeholder="Digite o username"
              />
              {editForm.formState.errors.username && (
                <p className="text-red-400 text-sm mt-1">{editForm.formState.errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                {...editForm.register("password")}
                className="bg-gray-800/50 border-gray-600/30"
                placeholder="Deixe em branco para manter a senha atual"
              />
              {editForm.formState.errors.password && (
                <p className="text-red-400 text-sm mt-1">{editForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-role">Papel</Label>
              <Select 
                value={editForm.watch("role")} 
                onValueChange={(value) => editForm.setValue("role", value as "admin" | "user")}
              >
                <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                  <SelectValue placeholder="Selecione o papel" />
                </SelectTrigger>
                <SelectContent className="glass-morphism-dark border-white/10">
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              {editForm.formState.errors.role && (
                <p className="text-red-400 text-sm mt-1">{editForm.formState.errors.role.message}</p>
              )}
            </div>

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}