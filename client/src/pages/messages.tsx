import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, Send, MessageSquare, CheckCheck, Clock, AlertCircle } from "lucide-react";

const messageSchema = z.object({
  channelId: z.string().min(1, "Canal é obrigatório"),
  recipient: z.string().min(1, "Destinatário é obrigatório"),
  type: z.enum(["text", "template"]),
  content: z.string().min(1, "Mensagem é obrigatória"),
  templateName: z.string().optional(),
});

type MessageForm = z.infer<typeof messageSchema>;

export default function Messages() {
  const [selectedContact, setSelectedContact] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      type: "text",
      content: "",
    },
  });

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["/api/contacts"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/messages"],
  });

  const { data: templates } = useQuery({
    queryKey: ["/api/templates"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      // Find contact by phone number or create new one
      let contact = contacts?.find((c: any) => c.phoneNumber === data.recipient);
      
      if (!contact) {
        // Create new contact
        const newContact = await apiRequest("POST", "/api/contacts", {
          name: `Contato ${data.recipient}`,
          phoneNumber: data.recipient,
        });
        contact = await newContact.json();
      }

      return apiRequest("POST", "/api/messages", {
        channelId: parseInt(data.channelId),
        contactId: contact.id,
        type: data.type,
        content: data.content,
        templateName: data.templateName,
      });
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso!",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MessageForm) => {
    sendMessageMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-4 w-4" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4" />;
      case "read":
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "read":
        return "bg-purple-100 text-purple-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const connectedChannels = channels?.filter((c: any) => c.status === "connected") || [];
  const approvedTemplates = templates?.filter((t: any) => t.status === "approved") || [];

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Mensagens</h2>
            <p className="text-gray-600">Envie mensagens e acompanhe conversas</p>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Send Message Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Enviar Nova Mensagem</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de Envio</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="recipient"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destinatário</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+55 11 99999-9999" 
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Mensagem</FormLabel>
                      <FormControl>
                        <RadioGroup 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="text" />
                            <Label htmlFor="text">Texto</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="template" id="template" />
                            <Label htmlFor="template">Template</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("type") === "template" && (
                  <FormField
                    control={form.control}
                    name="templateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {approvedTemplates.map((template: any) => (
                              <SelectItem key={template.id} value={template.name}>
                                {template.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("type") === "template" ? "Parâmetros do Template (JSON)" : "Mensagem"}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={4} 
                          placeholder={
                            form.watch("type") === "template" 
                              ? '{"1": "João", "2": "R$ 100,00"}'
                              : "Digite sua mensagem..."
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={sendMessageMutation.isPending || connectedChannels.length === 0}
                    className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </div>

                {connectedChannels.length === 0 && (
                  <div className="text-center text-red-600 text-sm">
                    Nenhum canal conectado. Configure um canal primeiro.
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Message History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Mensagens</CardTitle>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="text-center py-8">Carregando mensagens...</div>
            ) : messages && messages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mensagem
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Canal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {messages.map((message: any) => (
                      <tr key={message.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(message.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{message.contact.name}</div>
                            <div className="text-gray-500">{message.contact.phoneNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate">
                            {message.type === "template" && message.templateName && (
                              <Badge variant="outline" className="mr-2">
                                {message.templateName}
                              </Badge>
                            )}
                            {message.content}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusColor(message.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(message.status)}
                              <span className="capitalize">{message.status}</span>
                            </div>
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {message.channel.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Nenhuma mensagem encontrada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
