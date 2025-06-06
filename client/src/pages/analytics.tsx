import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, MessageSquare, Users, Bot, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/stats-card";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Analytics() {
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("7d");

  const { data: channels = [] } = useQuery({
    queryKey: ["/api/channels"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics", selectedChannel, dateRange],
  });

  const { data: channelStats = [] } = useQuery({
    queryKey: ["/api/analytics/channels", dateRange],
  });

  const { data: chatbotStats } = useQuery({
    queryKey: ["/api/analytics/chatbot", selectedChannel, dateRange],
  });

  const { data: responseTimeData = [] } = useQuery({
    queryKey: ["/api/analytics/response-time", selectedChannel, dateRange],
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Avançados</h1>
              <p className="text-gray-600">Análise detalhada de performance por canal</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                {channels.map((channel: any) => (
                  <SelectItem key={channel.id} value={channel.id.toString()}>
                    {channel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Cards de Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Mensagens Enviadas"
            value={formatNumber(analytics?.messagesSent || 0)}
            icon={MessageSquare}
            change={`+${calculatePercentageChange(analytics?.messagesSent || 0, analytics?.previousMessagesSent || 0).toFixed(1)}%`}
            changeType="positive"
            bgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatsCard
            title="Mensagens Recebidas"
            value={formatNumber(analytics?.messagesReceived || 0)}
            icon={MessageSquare}
            change={`+${calculatePercentageChange(analytics?.messagesReceived || 0, analytics?.previousMessagesReceived || 0).toFixed(1)}%`}
            changeType="positive"
            bgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <StatsCard
            title="Contatos Únicos"
            value={formatNumber(analytics?.uniqueContacts || 0)}
            icon={Users}
            change={`+${calculatePercentageChange(analytics?.uniqueContacts || 0, analytics?.previousUniqueContacts || 0).toFixed(1)}%`}
            changeType="positive"
            bgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatsCard
            title="Ativações do Chatbot"
            value={formatNumber(analytics?.chatbotActivations || 0)}
            icon={Bot}
            change={`+${calculatePercentageChange(analytics?.chatbotActivations || 0, analytics?.previousChatbotActivations || 0).toFixed(1)}%`}
            changeType="positive"
            bgColor="bg-orange-50"
            iconColor="text-orange-600"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Mensagens ao Longo do Tempo */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade de Mensagens</CardTitle>
              <CardDescription>Mensagens enviadas e recebidas ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics?.timeSeriesData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sent" stroke="#10b981" strokeWidth={2} name="Enviadas" />
                  <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} name="Recebidas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Performance por Canal */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Canal</CardTitle>
              <CardDescription>Comparação de mensagens entre canais</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channelName" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messagesSent" fill="#10b981" name="Enviadas" />
                  <Bar dataKey="messagesReceived" fill="#3b82f6" name="Recebidas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Taxa de Entrega */}
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Entrega</CardTitle>
              <CardDescription>Status das mensagens enviadas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.deliveryStats || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(analytics?.deliveryStats || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tempo de Resposta */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Resposta</CardTitle>
              <CardDescription>Tempo médio de resposta ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} min`, "Tempo médio"]} />
                  <Line type="monotone" dataKey="averageResponseTime" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Estatísticas do Chatbot */}
        {chatbotStats && (
          <Card>
            <CardHeader>
              <CardTitle>Performance do Chatbot</CardTitle>
              <CardDescription>Estatísticas detalhadas das regras automáticas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{chatbotStats.totalActivations}</div>
                  <p className="text-gray-600">Total de Ativações</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{chatbotStats.activeRules}</div>
                  <p className="text-gray-600">Regras Ativas</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {chatbotStats.successRate ? `${chatbotStats.successRate.toFixed(1)}%` : "0%"}
                  </div>
                  <p className="text-gray-600">Taxa de Sucesso</p>
                </div>
              </div>
              
              {chatbotStats.topRules && chatbotStats.topRules.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Regras Mais Ativadas</h4>
                  <div className="space-y-2">
                    {chatbotStats.topRules.map((rule: any, index: number) => (
                      <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">#{index + 1}</Badge>
                          <span className="font-medium">{rule.name}</span>
                          <Badge variant="secondary">{rule.trigger}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{rule.activations}</div>
                          <div className="text-sm text-gray-600">ativações</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}