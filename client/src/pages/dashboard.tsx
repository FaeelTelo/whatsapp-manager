import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/stats-card";
import { useLocation } from "wouter";
import { 
  MessageSquare, 
  Users, 
  FileText, 
  TrendingUp,
  Send,
  Inbox,
  CheckCheck,
  Plus,
  RefreshCw
} from "lucide-react";

interface Stats {
  sent: number;
  received: number;
  deliveryRate: number;
  totalContacts: number;
}

interface Message {
  id: number;
  content: string;
  contact: {
    name: string;
    phoneNumber: string;
  };
  channel: {
    name: string;
  };
  status: string;
  direction: string;
  createdAt: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentMessages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ["/api/channels"],
  });

  const connectedChannels = channels?.filter((c: any) => c.status === "connected") || [];

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Visão geral das suas atividades do WhatsApp Business</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setLocation("/messages")}
              className="bg-whatsapp hover:bg-whatsapp-dark text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Mensagem
            </Button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4" />
              <span>Última atualização: há 2 minutos</span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Mensagens Enviadas"
            value={statsLoading ? "..." : stats?.sent.toLocaleString() || "0"}
            icon={Send}
            change="+12%"
            changeType="positive"
            description="vs mês passado"
            bgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          
          <StatsCard
            title="Mensagens Recebidas"
            value={statsLoading ? "..." : stats?.received.toLocaleString() || "0"}
            icon={Inbox}
            change="+8%"
            changeType="positive"
            description="vs mês passado"
            bgColor="bg-green-100"
            iconColor="text-green-600"
          />
          
          <StatsCard
            title="Contatos Ativos"
            value={statsLoading ? "..." : stats?.totalContacts.toLocaleString() || "0"}
            icon={Users}
            change="+15%"
            changeType="positive"
            description="vs mês passado"
            bgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
          
          <StatsCard
            title="Taxa de Entrega"
            value={statsLoading ? "..." : `${stats?.deliveryRate || 0}%`}
            icon={CheckCheck}
            change="+2%"
            changeType="positive"
            description="vs mês passado"
            bgColor="bg-whatsapp/20"
            iconColor="text-whatsapp"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Mensagens nos Últimos 7 Dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p>Gráfico de mensagens</p>
                  <p className="text-sm">Implementar com Chart.js</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-500">Carregando...</div>
                ) : recentMessages && recentMessages.length > 0 ? (
                  recentMessages.slice(0, 5).map((message) => (
                    <div key={message.id} className="flex items-start space-x-3">
                      <div className="bg-whatsapp/20 p-2 rounded-full">
                        <MessageSquare className="h-4 w-4 text-whatsapp" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {message.direction === "outbound" 
                            ? `Mensagem enviada para ${message.contact.name}`
                            : `Mensagem recebida de ${message.contact.name}`
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          Canal: {message.channel.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Channel Status */}
        {!channelsLoading && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Status dos Canais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {connectedChannels.length > 0 ? (
                  connectedChannels.map((channel: any) => (
                    <div key={channel.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-medium text-gray-900">{channel.name}</p>
                        <p className="text-sm text-gray-500">{channel.phoneNumber}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center text-gray-500 py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum canal conectado</p>
                    <Button 
                      onClick={() => setLocation("/channels")}
                      className="mt-2"
                      variant="outline"
                    >
                      Configurar Canal
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
