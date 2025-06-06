import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTemplateSchema } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  FileText, 
  MessageSquare, 
  Edit2, 
  Check, 
  Clock, 
  X,
  Send
} from "lucide-react";

type TemplateForm = z.infer<typeof insertTemplateSchema>;

export default function Templates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<TemplateForm>({
    resolver: zodResolver(insertTemplateSchema),
    defaultValues: {
      name: "",
      displayName: "",
      category: "marketing",
      language: "pt_BR",
      content: "",
    },
  });

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: TemplateForm) => apiRequest("POST", "/api/templates", data),
    onSuccess: () => {
      toast({
        title: "Template criado",
        description: "O template foi criado e está aguardando aprovação!",
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar template",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TemplateForm) => {
    createTemplateMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <Check className="h-4 w-4" />;
      case "rejected":
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return "Pendente";
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case "marketing":
        return "Marketing";
      case "transactional":
        return "Transacional";
      case "support":
        return "Suporte";
      default:
        return category;
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Templates</h2>
            <p className="text-gray-600">Gerencie templates de mensagens aprovados</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                onClick={() => {
                  setEditingTemplate(null);
                  form.reset();
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Editar Template" : "Novo Template"}
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
                          <FormLabel>Nome do Template</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="nome_template" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome de Exibição</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome Amigável" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="transactional">Transacional</SelectItem>
                              <SelectItem value="support">Suporte</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Idioma</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pt_BR">Português (BR)</SelectItem>
                              <SelectItem value="en_US">English (US)</SelectItem>
                              <SelectItem value="es_ES">Español</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conteúdo do Template</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={6}
                            placeholder="Olá! Bem-vindo à nossa empresa..."
                            {...field}
                          />
                        </FormControl>
                        <div className="text-sm text-gray-500">
                          Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, etc. para parâmetros dinâmicos
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTemplateMutation.isPending}
                      className="bg-whatsapp hover:bg-whatsapp-dark text-white"
                    >
                      {createTemplateMutation.isPending ? "Criando..." : "Criar Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {templatesLoading ? (
          <div className="text-center py-8">Carregando templates...</div>
        ) : templates && Array.isArray(templates) && templates.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {templates.map((template: any) => (
              <Card key={template.id} className="h-fit">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.displayName}</CardTitle>
                      <p className="text-sm text-gray-500">{template.name}</p>
                    </div>
                    <Badge className={getStatusColor(template.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(template.status)}
                        <span>{getStatusText(template.status)}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Categoria: {getCategoryText(template.category)}</span>
                    <span>Idioma: {template.language.replace("_", "-").toUpperCase()}</span>
                  </div>
                  <div className="flex space-x-2">
                    {template.status === "approved" ? (
                      <Button className="flex-1 bg-whatsapp hover:bg-whatsapp-dark text-white">
                        <Send className="mr-2 h-4 w-4" />
                        Usar Template
                      </Button>
                    ) : (
                      <Button className="flex-1" variant="outline" disabled>
                        <Clock className="mr-2 h-4 w-4" />
                        {template.status === "pending" ? "Aguardando Aprovação" : "Rejeitado"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro template de mensagem para começar a enviar mensagens personalizadas.
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-whatsapp hover:bg-whatsapp-dark text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Template
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
