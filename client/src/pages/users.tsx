import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserCheck, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "manager", "user"]),
  permissions: z.array(z.string()).default([]),
});

type UserForm = z.infer<typeof userSchema>;

const roleLabels = {
  admin: "Administrador",
  manager: "Gerente",
  user: "Usuário",
};

const availablePermissions = [
  { id: "channels_manage", label: "Gerenciar Canais" },
  { id: "contacts_manage", label: "Gerenciar Contatos" },
  { id: "messages_send", label: "Enviar Mensagens" },
  { id: "templates_manage", label: "Gerenciar Templates" },
  { id: "chatbot_manage", label: "Gerenciar Chatbot" },
  { id: "analytics_view", label: "Ver Analytics" },
  { id: "users_manage", label: "Gerenciar Usuários" },
  { id: "settings_manage", label: "Gerenciar Configurações" },
];

export default function Users() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: (data: UserForm) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserForm> }) =>
      apiRequest("PATCH", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "user",
      permissions: [],
    },
  });

  const onSubmit = (data: UserForm) => {
    createMutation.mutate(data);
  };

  const toggleUserStatus = (user: any) => {
    updateMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive },
    });
  };

  const deleteUser = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteMutation.mutate(id);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
              <p className="text-gray-600">Gerencie usuários e permissões</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Digite o nome" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="Senha mínima 6 caracteres"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                      <FormItem>
                        <FormLabel>Permissões</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availablePermissions.map((permission) => (
                            <FormField
                              key={permission.id}
                              control={form.control}
                              name="permissions"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, permission.id])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== permission.id)
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {permission.label}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {usersLoading ? (
          <div className="text-center py-8">Carregando usuários...</div>
        ) : users && Array.isArray(users) && users.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {users.map((user: any) => (
              <Card key={user.id} className={`${user.isActive ? "" : "opacity-60"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {roleLabels[user.role as keyof typeof roleLabels]}
                      </Badge>
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={() => toggleUserStatus(user)}
                      />
                    </div>
                  </div>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Permissões:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.permissions && user.permissions.length > 0 ? (
                        user.permissions.map((permission: string) => {
                          const permissionLabel = availablePermissions.find(p => p.id === permission)?.label;
                          return (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permissionLabel}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-sm text-gray-500">Nenhuma permissão específica</span>
                      )}
                    </div>
                  </div>
                  {user.lastLogin && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Último acesso:</p>
                      <p className="text-sm text-gray-800">
                        {format(new Date(user.lastLogin), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end space-x-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-gray-600 mb-4">
              Adicione usuários para gerenciar acesso ao sistema
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Usuário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
