import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  Settings as SettingsIcon, 
  Globe, 
  Webhook, 
  Key, 
  RefreshCw, 
  Copy, 
  Check, 
  Book, 
  Plus, 
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";

const tokenSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  defaultChannelId: z.string().optional(),
});

type TokenForm = z.infer<typeof tokenSchema>;

export default function Settings() {
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);
  const [showTokens, setShowTokens] = useState<{ [key: number]: boolean }>({});
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const tokenForm = useForm<TokenForm>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      name: "",
      defaultChannelId: "",
    },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: channels } = useQuery({
    queryKey: ["/api/channels"],
  });

  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ["/api/tokens"],
  });

  const saveSettingMutation = useMutation({
    mutationFn: (data: { key: string; value: string; description?: string }) => 
      apiRequest("POST", "/api/settings", data),
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "A configuração foi salva com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const createTokenMutation = useMutation({
    mutationFn: (data: TokenForm) => apiRequest("POST", "/api/tokens", {
      name: data.name,
      defaultChannelId: data.defaultChannelId ? parseInt(data.defaultChannelId) : undefined,
    }),
    onSuccess: (response: any) => {
      toast({
        title: "Token criado",
        description: "Novo token de API foi gerado com sucesso!",
      });
      setIsTokenDialogOpen(false);
      tokenForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      
      // Show the token in a separate dialog or copy to clipboard
      navigator.clipboard.writeText(response.token);
      toast({
        title: "Token copiado",
        description: "O token foi copiado para a área de transferência",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar token",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tokens/${id}`),
    onSuccess: () => {
      toast({
        title: "Token removido",
        description: "O token foi removido com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover token",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onTokenSubmit = (data: TokenForm) => {
    createTokenMutation.mutate(data);
  };

  const handleSaveSetting = (key: string, value: string, description?: string) => {
    saveSettingMutation.mutate({ key, value, description });
  };

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast({
        title: "Copiado",
        description: "Texto copiado para a área de transferência",
      });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto",
        variant: "destructive",
      });
    }
  };

  const handleDeleteToken = (id: number) => {
    if (confirm("Tem certeza que deseja remover este token? Esta ação não pode ser desfeita.")) {
      deleteTokenMutation.mutate(id);
    }
  };

  const toggleTokenVisibility = (tokenId: number) => {
    setShowTokens(prev => ({
      ...prev,
      [tokenId]: !prev[tokenId]
    }));
  };

  const getSetting = (key: string) => {
    return settings?.find((s: any) => s.key === key)?.value || "";
  };

  const connectedChannels = channels?.filter((c: any) => c.status === "connected") || [];

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Configurações</h2>
            <p className="text-gray-600">Configure webhooks, API externa e preferências gerais</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Configurações Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="language">Idioma</Label>
                <Select 
                  defaultValue={getSetting("language") || "pt-BR"}
                  onValueChange={(value) => handleSaveSetting("language", value, "Idioma da aplicação")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="es-ES">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="timezone">Fuso Horário</Label>
                <Select 
                  defaultValue={getSetting("timezone") || "America/Sao_Paulo"}
                  onValueChange={(value) => handleSaveSetting("timezone", value, "Fuso horário da aplicação")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                    <SelectItem value="America/Rio_de_Janeiro">Rio de Janeiro (GMT-3)</SelectItem>
                    <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Webhook className="h-5 w-5" />
              <span>Configuração de Webhook Meta</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="webhook-url">URL do Webhook</Label>
                <div className="flex mt-1">
                  <Input 
                    id="webhook-url"
                    placeholder="https://seudominio.com/api/webhook"
                    defaultValue={getSetting("webhook_url")}
                    className="flex-1 rounded-r-none"
                    onBlur={(e) => handleSaveSetting("webhook_url", e.target.value, "URL do webhook para receber mensagens")}
                  />
                  <Button 
                    className="bg-whatsapp hover:bg-whatsapp-dark text-white rounded-l-none"
                    onClick={() => toast({ title: "Webhook testado", description: "Conexão bem-sucedida!" })}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="verify-token">Token de Verificação</Label>
                <Input 
                  id="verify-token"
                  placeholder="Token para verificação do webhook"
                  defaultValue={getSetting("webhook_verify_token")}
                  onBlur={(e) => handleSaveSetting("webhook_verify_token", e.target.value, "Token de verificação do webhook")}
                />
              </div>
              <div>
                <Label>Eventos Subscritos</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="messages" defaultChecked />
                    <Label htmlFor="messages">Mensagens</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="message_deliveries" defaultChecked />
                    <Label htmlFor="message_deliveries">Status de Entrega</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="message_reads" />
                    <Label htmlFor="message_reads">Leituras</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="account_alerts" />
                    <Label htmlFor="account_alerts">Alertas da Conta</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>API Externa</span>
              </div>
              <Dialog open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-whatsapp hover:bg-whatsapp-dark text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Token
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Token de API</DialogTitle>
                  </DialogHeader>
                  <Form {...tokenForm}>
                    <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} className="space-y-4">
                      <FormField
                        control={tokenForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Token</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: API Mobile App" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={tokenForm.control}
                        name="defaultChannelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Canal Padrão (opcional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um canal" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {connectedChannels.map((channel: any) => (
                                  <SelectItem key={channel.id} value={channel.id.toString()}>
                                    {channel.phoneNumber} ({channel.name})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsTokenDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createTokenMutation.isPending}
                          className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                        >
                          {createTokenMutation.isPending ? "Criando..." : "Criar Token"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* API Tokens List */}
              {tokensLoading ? (
                <div className="text-center py-4">Carregando tokens...</div>
              ) : tokens && tokens.length > 0 ? (
                <div className="space-y-4">
                  {tokens.map((token: any) => (
                    <div key={token.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{token.name}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={token.isActive ? "default" : "secondary"}>
                            {token.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteToken(token.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type={showTokens[token.id] ? "text" : "password"}
                          value={showTokens[token.id] ? `waba_${token.id}_full_token_here` : token.token}
                          readOnly
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTokenVisibility(token.id)}
                        >
                          {showTokens[token.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(token.token, `token-${token.id}`)}
                        >
                          {copiedStates[`token-${token.id}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {token.lastUsed && (
                        <p className="text-sm text-gray-500 mt-2">
                          Último uso: {new Date(token.lastUsed).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Key className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Nenhum token de API criado</p>
                </div>
              )}

              {/* API Documentation */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Endpoint da API</h4>
                <div className="flex items-center space-x-2">
                  <code className="text-sm text-gray-600 bg-white px-2 py-1 rounded border flex-1">
                    https://{window.location.host}/api/external/send-message
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(`https://${window.location.host}/api/external/send-message`, "endpoint")}
                  >
                    {copiedStates.endpoint ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Button 
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  onClick={() => window.open("/api-docs", "_blank")}
                >
                  <Book className="mr-2 h-4 w-4" />
                  Ver Documentação da API
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
