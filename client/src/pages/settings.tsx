import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings, User, Bell, Lock, Database, Globe, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType, InsertUser } from "@shared/schema";
import { useState, useEffect } from "react";
import { format } from "date-fns";

const userFormSchema = z.object({
  username: z.string().min(3, "Username deve ter pelo menos 3 caracteres"),
  password: z.string().optional(),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.string().min(1, "Cargo é obrigatório"),
  initials: z.string().min(2, "Iniciais devem ter pelo menos 2 caracteres").max(3, "Iniciais devem ter no máximo 3 caracteres"),
});

const adminPasswordSchema = z.object({
  password: z.string().min(1, "Senha é obrigatória"),
});

type UserFormData = z.infer<typeof userFormSchema>;
type AdminPasswordData = z.infer<typeof adminPasswordSchema>;

interface SystemSettings {
  system_name: string;
  institution: string;
  timezone: string;
  language: string;
  urgent_days: number;
  warning_days: number;
  auto_archive: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteUserConfirmOpen, setDeleteUserConfirmOpen] = useState(false);
  const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
  const [restartSystemConfirmOpen, setRestartSystemConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    system_name: "Lazarus CG - Sistema de Controle",
    institution: "Unidade Prisional - Manaus/AM", 
    timezone: "america/manaus",
    language: "pt-br",
    urgent_days: 2,
    warning_days: 7,
    auto_archive: true
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: settings } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setSystemSettings(settings);
    }
  }, [settings]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      role: "",
      initials: "",
    },
  });

  const deletePasswordForm = useForm<AdminPasswordData>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const cachePasswordForm = useForm<AdminPasswordData>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const restartPasswordForm = useForm<AdminPasswordData>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDialogOpen(false);
      form.reset();
      toast({
        title: "Usuário criado",
        description: "Novo usuário foi criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar usuário.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setUserDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "Usuário atualizado",
        description: "Usuário foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar usuário.",
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: SystemSettings) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemName: settings.system_name,
          institution: settings.institution,
          timezone: settings.timezone,
          language: settings.language,
          urgentDays: settings.urgent_days,
          warningDays: settings.warning_days,
          autoArchive: settings.auto_archive
        }),
      });
      if (!response.ok) throw new Error("Failed to save settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações do sistema foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuário removido",
        description: "Usuário foi removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover usuário.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/reports/export?format=json&period=all");
      if (!response.ok) throw new Error("Failed to export data");
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `dados-sistema-completo-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Dados exportados",
        description: "Os dados do sistema foram exportados com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro na exportação",
        description: "Falha ao exportar os dados do sistema.",
        variant: "destructive",
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/system/clear-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to clear cache");
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all queries to force refetch
      queryClient.invalidateQueries();
      // Clear localStorage if needed
      if (typeof Storage !== "undefined") {
        localStorage.clear();
      }
      toast({
        title: "Cache limpo",
        description: "O cache do sistema foi limpo com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao limpar cache",
        description: "Falha ao limpar o cache do sistema.",
        variant: "destructive",
      });
    },
  });

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "", // Don't pre-fill password
      name: user.name,
      role: user.role,
      initials: user.initials,
    });
    setUserDialogOpen(true);
  };

  const handleDeleteUser = (id: number) => {
    setUserToDelete(id);
    setDeleteUserConfirmOpen(true);
  };

  const confirmDeleteUser = (data: AdminPasswordData) => {
    // Senha de segurança para remoção de usuário
    const ADMIN_PASSWORD = "Guardiao";
    
    if (data.password !== ADMIN_PASSWORD) {
      toast({
        title: "Senha incorreta",
        description: "A senha de administrador está incorreta.",
        variant: "destructive",
      });
      return;
    }

    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
      setDeleteUserConfirmOpen(false);
      setUserToDelete(null);
      deletePasswordForm.reset();
    }
  };

  const confirmClearCache = (data: AdminPasswordData) => {
    // Senha de segurança para limpeza de cache
    const ADMIN_PASSWORD = "Guardiao";
    
    if (data.password !== ADMIN_PASSWORD) {
      toast({
        title: "Senha incorreta",
        description: "A senha de administrador está incorreta.",
        variant: "destructive",
      });
      return;
    }

    clearCacheMutation.mutate();
    setClearCacheConfirmOpen(false);
    cachePasswordForm.reset();
  };

  const confirmRestartSystem = (data: AdminPasswordData) => {
    // Senha de segurança para reiniciar sistema
    const ADMIN_PASSWORD = "Guardiao";
    
    if (data.password !== ADMIN_PASSWORD) {
      toast({
        title: "Senha incorreta",
        description: "A senha de administrador está incorreta.",
        variant: "destructive",
      });
      return;
    }

    // Implementar reinicialização do sistema
    toast({
      title: "Sistema reiniciando",
      description: "O sistema será reiniciado em instantes...",
    });
    
    // Simular reinicialização (em produção seria uma chamada à API)
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    setRestartSystemConfirmOpen(false);
    restartPasswordForm.reset();
  };;

  const onSubmit = (data: UserFormData) => {
    const submitData = {
      ...data,
      password: data.password || "123456" // Default password if not provided
    };
    
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, data: submitData });
    } else {
      createUserMutation.mutate(submitData);
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "Configurações salvas",
      description: "As configurações foram atualizadas com sucesso.",
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 md:ml-64 ml-0 flex flex-col">
        <Header />
        
        <div className="flex-1 p-3 md:p-6 overflow-y-auto space-y-4 md:space-y-6">
          <h1 className="text-xl md:text-3xl font-bold">Configurações do Sistema</h1>
          
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="glass-morphism p-1">
              <TabsTrigger value="general" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>Geral</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Segurança</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2">
                <Database className="w-4 h-4" />
                <span>Sistema</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-morphism">
                  <CardHeader>
                    <CardTitle>Configurações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="systemName">Nome do Sistema</Label>
                      <Input
                        id="systemName"
                        value={systemSettings.system_name}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, system_name: e.target.value }))}
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="institution">Instituição</Label>
                      <Input
                        id="institution"
                        value={systemSettings.institution}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, institution: e.target.value }))}
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="timezone">Fuso Horário</Label>
                      <Select 
                        value={systemSettings.timezone} 
                        onValueChange={(value) => setSystemSettings(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism-dark border-white/10">
                          <SelectItem value="america/manaus">Brasil/Manaus (UTC-4)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="language">Idioma</Label>
                      <Select 
                        value={systemSettings.language}
                        onValueChange={(value) => setSystemSettings(prev => ({ ...prev, language: value }))}
                      >
                        <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism-dark border-white/10">
                          <SelectItem value="pt-br">Português (Brasil)</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morphism">
                  <CardHeader>
                    <CardTitle>Configurações de Prazos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="urgentDays">Prazo Urgente (dias)</Label>
                      <Input
                        id="urgentDays"
                        type="number"
                        value={systemSettings.urgent_days}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, urgent_days: parseInt(e.target.value) || 2 }))}
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Documentos com prazo menor que este valor serão marcados como urgentes
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="warningDays">Aviso de Vencimento (dias)</Label>
                      <Input
                        id="warningDays"
                        type="number"
                        value={systemSettings.warning_days}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, warning_days: parseInt(e.target.value) || 7 }))}
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Enviar avisos quando faltarem estes dias para o vencimento
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="autoArchive">Arquivamento Automático</Label>
                        <p className="text-xs text-gray-400">
                          Arquivar documentos concluídos após 30 dias
                        </p>
                      </div>
                      <Switch 
                        id="autoArchive" 
                        checked={systemSettings.auto_archive}
                        onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, auto_archive: checked }))}
                      />
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        onClick={() => saveSettingsMutation.mutate(systemSettings)}
                        disabled={saveSettingsMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Usuários Ativos</h3>
                      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              setEditingUser(null);
                              form.reset();
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Usuário
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="glass-morphism-dark border-white/10 max-w-md">
                          <DialogHeader>
                            <DialogTitle>
                              {editingUser ? "Editar Usuário" : "Novo Usuário"}
                            </DialogTitle>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Nome do usuário" 
                                        className="bg-gray-800/50 border-gray-600/30"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nome de Usuário</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="usuario.nome" 
                                        className="bg-gray-800/50 border-gray-600/30"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha (opcional - padrão: 123456)"}
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="password"
                                        placeholder={editingUser ? "••••••••" : "Deixe vazio para senha padrão (123456)"} 
                                        className="bg-gray-800/50 border-gray-600/30"
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    {!editingUser && (
                                      <p className="text-xs text-gray-400">
                                        Se não informar uma senha, será usado: 123456
                                      </p>
                                    )}
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cargo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="bg-gray-800/50 border-gray-600/30">
                                          <SelectValue placeholder="Selecione o cargo" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="glass-morphism-dark border-white/10">
                                        <SelectItem value="Administradora">Administradora</SelectItem>
                                        <SelectItem value="Assistente Social">Assistente Social</SelectItem>
                                        <SelectItem value="Psicóloga">Psicóloga</SelectItem>
                                        <SelectItem value="Advogado">Advogado</SelectItem>
                                        <SelectItem value="Secretário">Secretário</SelectItem>
                                        <SelectItem value="Colaborador">Colaborador</SelectItem>
                                        <SelectItem value="Estagiário">Estagiário</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="initials"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Iniciais</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="AC" 
                                        className="bg-gray-800/50 border-gray-600/30"
                                        maxLength={3}
                                        {...field} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <div className="flex justify-end space-x-2 pt-4">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => setUserDialogOpen(false)}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  type="submit" 
                                  className="bg-blue-600 hover:bg-blue-700"
                                  disabled={createUserMutation.isPending || updateUserMutation.isPending}
                                >
                                  {editingUser ? "Atualizar" : "Criar"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-4 font-medium text-gray-300">Nome</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-300">Usuário</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-300">Cargo</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-300">Iniciais</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-300">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-4 px-4 text-white">{user.name}</td>
                              <td className="py-4 px-4 text-gray-300">{user.username}</td>
                              <td className="py-4 px-4 text-gray-300">{user.role}</td>
                              <td className="py-4 px-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                                  {user.initials}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEditUser(user)}
                                    className="hover:bg-blue-500/20"
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-red-400 hover:bg-red-500/20"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Remover
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle>Configurações de Notificações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Alertas por Email</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Documentos Vencidos</Label>
                        <p className="text-xs text-gray-400">Notificar quando documentos vencerem</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Prazos Urgentes</Label>
                        <p className="text-xs text-gray-400">Alertar sobre prazos urgentes</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Relatórios Semanais</Label>
                        <p className="text-xs text-gray-400">Enviar resumo semanal por email</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Configurações de Email</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpServer">Servidor SMTP</Label>
                        <Input
                          id="smtpServer"
                          placeholder="smtp.exemplo.com"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="smtpPort">Porta SMTP</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          defaultValue="587"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="emailUser">Usuário</Label>
                        <Input
                          id="emailUser"
                          placeholder="sistema@unidade.gov.br"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="emailPassword">Senha</Label>
                        <Input
                          id="emailPassword"
                          type="password"
                          className="bg-gray-800/50 border-gray-600/30"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle>Configurações de Segurança</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Políticas de Senha</h3>
                    
                    <div>
                      <Label htmlFor="minPasswordLength">Comprimento Mínimo da Senha</Label>
                      <Input
                        id="minPasswordLength"
                        type="number"
                        defaultValue="8"
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Exigir Caracteres Especiais</Label>
                        <p className="text-xs text-gray-400">Senhas devem conter símbolos</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Exigir Números</Label>
                        <p className="text-xs text-gray-400">Senhas devem conter números</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Sessão e Acesso</h3>
                    
                    <div>
                      <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        defaultValue="60"
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Autenticação de Dois Fatores</Label>
                        <p className="text-xs text-gray-400">Habilitar 2FA para todos os usuários</p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Log de Auditoria</Label>
                        <p className="text-xs text-gray-400">Registrar todas as ações do sistema</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card className="glass-morphism">
                <CardHeader>
                  <CardTitle>Configurações do Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Backup e Manutenção</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Backup Automático</Label>
                        <p className="text-xs text-gray-400">Executar backup diário dos dados</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div>
                      <Label htmlFor="backupRetention">Retenção de Backup (dias)</Label>
                      <Input
                        id="backupRetention"
                        type="number"
                        defaultValue="30"
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="logRetention">Retenção de Logs (dias)</Label>
                      <Input
                        id="logRetention"
                        type="number"
                        defaultValue="90"
                        className="bg-gray-800/50 border-gray-600/30"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informações do Sistema</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-400">Versão do Sistema</Label>
                        <p className="text-white">v1.0.0</p>
                      </div>
                      
                      <div>
                        <Label className="text-gray-400">Última Atualização</Label>
                        <p className="text-white">02/06/2025</p>
                      </div>
                      
                      <div>
                        <Label className="text-gray-400">Banco de Dados</Label>
                        <p className="text-white">EM PostgreSQL Neon</p>
                      </div>
                      
                      <div>
                        <Label className="text-gray-400">Status do Sistema</Label>
                        <p className="text-green-400">Operacional</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Ações do Sistema</h3>
                    
                    <div className="flex space-x-4">
                      <Button 
                        variant="outline" 
                        className="bg-gray-700/50"
                        onClick={() => exportDataMutation.mutate()}
                        disabled={exportDataMutation.isPending}
                      >
                        {exportDataMutation.isPending ? "Exportando..." : "Exportar Dados"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="bg-gray-700/50"
                        onClick={() => setClearCacheConfirmOpen(true)}
                        disabled={clearCacheMutation.isPending}
                      >
                        {clearCacheMutation.isPending ? "Limpando..." : "Limpar Cache"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="bg-red-600/20 text-red-400 border-red-500/30"
                        onClick={() => setRestartSystemConfirmOpen(true)}
                      >
                        Reiniciar Sistema
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Salvar Configurações
            </Button>
          </div>
        </div>
      </main>

      {/* Dialog de confirmação para remover usuário */}
      <Dialog open={deleteUserConfirmOpen} onOpenChange={setDeleteUserConfirmOpen}>
        <DialogContent className="glass-morphism-dark border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar Remoção de Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Esta ação é irreversível. Digite a senha de administrador para confirmar a remoção do usuário.
            </p>
            <Form {...deletePasswordForm}>
              <form onSubmit={deletePasswordForm.handleSubmit(confirmDeleteUser)} className="space-y-4">
                <FormField
                  control={deletePasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha de Administrador</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Digite a senha..." 
                          className="bg-gray-800/50 border-gray-600/30"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setDeleteUserConfirmOpen(false);
                      deletePasswordForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="destructive"
                    disabled={deleteUserMutation.isPending}
                  >
                    {deleteUserMutation.isPending ? "Removendo..." : "Confirmar Remoção"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para limpar cache */}
      <Dialog open={clearCacheConfirmOpen} onOpenChange={setClearCacheConfirmOpen}>
        <DialogContent className="glass-morphism-dark border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Confirmar Limpeza de Cache</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              Limpar o cache pode afetar temporariamente a performance do sistema. Digite a senha de administrador para confirmar.
            </p>
            <Form {...cachePasswordForm}>
              <form onSubmit={cachePasswordForm.handleSubmit(confirmClearCache)} className="space-y-4">
                <FormField
                  control={cachePasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha de Administrador</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Digite a senha..." 
                          className="bg-gray-800/50 border-gray-600/30"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setClearCacheConfirmOpen(false);
                      cachePasswordForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-yellow-600 hover:bg-yellow-700"
                    disabled={clearCacheMutation.isPending}
                  >
                    {clearCacheMutation.isPending ? "Limpando..." : "Confirmar Limpeza"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação para reiniciar sistema */}
      <Dialog open={restartSystemConfirmOpen} onOpenChange={setRestartSystemConfirmOpen}>
        <DialogContent className="glass-morphism-dark border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-400">Confirmar Reinicialização do Sistema</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              ⚠️ ATENÇÃO: Esta ação reiniciará todo o sistema e causará indisponibilidade temporária. Digite a senha de administrador para confirmar.
            </p>
            <Form {...restartPasswordForm}>
              <form onSubmit={restartPasswordForm.handleSubmit(confirmRestartSystem)} className="space-y-4">
                <FormField
                  control={restartPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha de Administrador</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Digite a senha..." 
                          className="bg-gray-800/50 border-gray-600/30"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setRestartSystemConfirmOpen(false);
                      restartPasswordForm.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="destructive"
                  >
                    Confirmar Reinicialização
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}