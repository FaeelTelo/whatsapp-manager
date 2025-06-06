import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertChannelSchema } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Signal, 
  SignalHigh, 
  SignalLow,
  AlertCircle,
  Wifi,
  WifiOff
} from "lucide-react";

type ChannelForm = z.infer<typeof insertChannelSchema>;

export default function Channels() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<ChannelForm>({
    resolver: zodResolver(insertChannelSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      wabaId: "",
      accessToken: "",
    },
  });

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
  });

  const createChannelMutation = useMutation({
    mutationFn: (data: ChannelForm) => apiRequest("POST", "/api/channels", data),
    onSuccess: () => {
      toast({
        title: "Canal criado",
        description: "O canal foi adicionado e conectado com sucesso!",
      });
      setIsDialogOpen(false);
      setEditingChannel(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar canal",
        description: error.message || "Verifique as credenciais e tente novamente",
        variant: "destructive",
      });
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChannelForm> }) => 
      apiRequest("PUT", `/api/channels/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Canal atualizado",
        description: "As alterações foram salvas com sucesso!",
      });
      setIsDialogOpen(false);
      setEditingChannel(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar canal",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteChannelMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/channels/${id}`),
    onSuccess: () => {
      toast({
        title: "Canal removido",
        description: "O canal foi removido com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover canal",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChannelForm) => {
    if (editingChannel) {
      updateChannelMutation.mutate({ id: editingChannel.id, data });
    } else {
      createChannelMutation.mutate(data);
    }
  };

  const handleEdit = (channel: any) => {
    setEditingChannel(channel);
    form.reset({
      name: channel.name,
      phoneNumber: channel.phoneNumber,
      wabaId: channel.wabaId,
      accessToken: channel.accessToken,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este canal?")) {
      deleteChannelMutation.mutate(id);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Signal className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "disconnected":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "Conectado";
      case "disconnected":
        return "Desconectado";
      case "error":
        return "Erro";
      default:
        return "Desconhecido";
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Simple formatting for display
    return phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 $2 $3-$4");
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Canais WhatsApp</h2>
            <p className="text-gray-600">Gerencie seus números WhatsApp Business</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                onClick={() => {
                  setEditingChannel(null);
                  form.reset();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Canal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingChannel ? "Editar Canal" : "Adicionar Novo Canal"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Canal</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: Canal Principal" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do WhatsApp</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+5511999999999" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="wabaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID da Conta WhatsApp Business</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ID da WABA fornecido pela Meta" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token do Gerenciador Meta</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Token de acesso permanente da Meta" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Como obter as credenciais:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>1. Acesse o Meta Business Manager</li>
                      <li>2. Configure sua WhatsApp Business Account (WABA)</li>
                      <li>3. Gere um token de acesso permanente</li>
                      <li>4. Copie o ID da WABA e o token aqui</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createChannelMutation.isPending || updateChannelMutation.isPending}
                      className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                    >
                      {createChannelMutation.isPending || updateChannelMutation.isPending
                        ? "Conectando..."
                        : editingChannel 
                        ? "Salvar Alterações"
                        : "Adicionar Canal"
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Channels Table */}
        <Card>
          <CardHeader>
            <CardTitle>Canais Configurados</CardTitle>
          </CardHeader>
          <CardContent>
            {channelsLoading ? (
              <div className="text-center py-8">Carregando canais...</div>
            ) : channels && channels.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Canal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Atividade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mensagens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {channels.map((channel: any) => (
                      <tr key={channel.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`${
                              channel.status === "connected" 
                                ? "bg-whatsapp/20" 
                                : "bg-gray-200"
                            } p-2 rounded-lg mr-3`}>
                              <Phone className={`h-5 w-5 ${
                                channel.status === "connected"
                                  ? "text-whatsapp"
                                  : "text-gray-400"
                              }`} />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {channel.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {channel.wabaId.substring(0, 12)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPhoneNumber(channel.phoneNumber)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(channel.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(channel.status)}
                              <span>{getStatusText(channel.status)}</span>
                            </div>
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {channel.lastActivity 
                            ? new Date(channel.lastActivity).toLocaleString()
                            : "Nunca"
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {channel.messageCount || 0} mensagens
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(channel)}
                              className="text-whatsapp hover:text-whatsapp-dark"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(channel.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum canal configurado
                </h3>
                <p className="text-gray-600 mb-4">
                  Adicione seu primeiro canal WhatsApp Business para começar a enviar mensagens.
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Primeiro Canal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
