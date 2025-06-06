# WhatsApp Business API Manager

Uma aplicação web completa para gerenciar e enviar mensagens através da WhatsApp Business API oficial da Meta.

## 🚀 Funcionalidades

### 📱 Gerenciamento de Canais WABA
- Cadastro de números WhatsApp Business
- Validação automática de tokens e conectividade
- Monitoramento do status de conexão
- Estatísticas de mensagens por canal

### 💬 Envio de Mensagens
- Envio de mensagens de texto
- Suporte a templates aprovados pela Meta
- Histórico completo de mensagens
- Status de entrega em tempo real

### 👥 Gerenciamento de Contatos
- Cadastro e edição de contatos
- Busca e filtros avançados
- Histórico de interações
- Importação em lote

### 📝 Templates de Mensagem
- Criação de templates personalizados
- Suporte a parâmetros dinâmicos
- Status de aprovação da Meta
- Categorização (Marketing, Transacional, Suporte)

### ⚙️ Configurações Avançadas
- Configuração de webhooks Meta
- Geração de tokens de API externa
- Configurações gerais do sistema
- Documentação da API integrada

### 📊 Dashboard e Relatórios
- Estatísticas de mensagens enviadas/recebidas
- Taxa de entrega
- Atividade recente
- Gráficos e métricas

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Interface de usuário
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Shadcn/ui** - Componentes de UI
- **React Hook Form** - Gerenciamento de formulários
- **React Query** - Cache e sincronização de dados
- **Wouter** - Roteamento

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipagem estática
- **PostgreSQL** - Banco de dados
- **Drizzle ORM** - ORM para banco de dados
- **Axios** - Cliente HTTP para Graph API

### Integração
- **Meta WhatsApp Business API** - API oficial do WhatsApp
- **Graph API** - Endpoints da Meta
- **Webhook** - Recebimento de mensagens
- **JWT** - Autenticação de API externa

## 📋 Pré-requisitos

- **Node.js** 18 ou superior
- **PostgreSQL** 12 ou superior
- **Conta Meta Business** com WhatsApp Business API configurada
- **Token de Acesso Permanente** da Meta

## 🔧 Instalação no Windows

### 1. Instalar Node.js
1. Baixe o Node.js em https://nodejs.org/
2. Execute o instalador e siga as instruções
3. Verifique a instalação:
```cmd
node --version
npm --version
