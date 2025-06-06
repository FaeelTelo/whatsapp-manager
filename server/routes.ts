import { rateLimit } from "express-rate-limit";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChannelSchema, insertContactSchema, insertMessageSchema, insertTemplateSchema } from "@shared/schema";
import { WhatsAppAPI } from "./lib/whatsapp-api";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  


// Melhorar autenticação de tokens
const authenticateApiToken = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: "Token de autorização necessário no formato 'Bearer <token>'" 
      });
    }

    const token = authHeader.substring(7);
    if (!token || token.length < 32) {
      return res.status(401).json({ error: "Token inválido" });
    }

    const apiToken = await storage.getApiToken(token);
    
    if (!apiToken?.isActive) {
      return res.status(401).json({ error: "Token inválido ou inativo" });
    }

    // Registrar uso do token
    await storage.updateApiTokenUsage(token);
    req.apiToken = apiToken;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({ error: "Erro interno ao processar autenticação" });
  }
};
  
    
  // Channels routes
  app.get("/api/channels", async (req, res) => {
    try {
      const channels = await storage.getChannels();
      res.json(channels);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar canais" });
    }
  });

  app.post("/api/channels", async (req, res) => {
    try {
      console.log(`[POST /api/channels] Tentativa de criar canal:`, {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        wabaId: req.body.wabaId?.substring(0, 8) + "...", // Log apenas início do WABA ID
        hasAccessToken: !!req.body.accessToken
      });

      const validatedData = insertChannelSchema.parse(req.body);
      
      console.log(`[POST /api/channels] Dados validados com sucesso. Testando conexão com WhatsApp API...`);
      
      // Test WhatsApp API connection
      const whatsapp = new WhatsAppAPI(validatedData.accessToken);
      const isValid = await whatsapp.validateConnection(validatedData.wabaId);
      
      if (!isValid) {
        console.error(`[POST /api/channels] Falha na validação da conexão WhatsApp:`, {
          wabaId: validatedData.wabaId?.substring(0, 8) + "...",
          reason: "validateConnection retornou false"
        });
        return res.status(400).json({ 
          error: "Falha na conexão com WhatsApp Business API",
          details: "Verifique se o Access Token e WABA ID estão corretos e se a conta tem permissões adequadas"
        });
      }

      console.log(`[POST /api/channels] Conexão WhatsApp validada. Salvando canal no banco...`);

      const channel = await storage.createChannel(validatedData);
      
      console.log(`[POST /api/channels] Canal salvo no banco com ID: ${channel.id}. Atualizando status...`);
      
      await storage.updateChannelStatus(channel.id, "connected");
      
      console.log(`[POST /api/channels] Canal criado com sucesso:`, {
        id: channel.id,
        name: channel.name,
        phoneNumber: channel.phoneNumber
      });
      
      res.status(201).json(channel);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error(`[POST /api/channels] Erro de validação de dados:`, {
          errors: error.errors,
          receivedData: {
            name: req.body.name,
            phoneNumber: req.body.phoneNumber,
            hasWabaId: !!req.body.wabaId,
            hasAccessToken: !!req.body.accessToken
          }
        });
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
      }

      if (error.message && error.message.includes('UNIQUE constraint')) {
        console.error(`[POST /api/channels] Erro de duplicação:`, {
          error: error.message,
          phoneNumber: req.body.phoneNumber
        });
        return res.status(400).json({ 
          error: "Canal já existe", 
          details: "Já existe um canal com este número de telefone ou WABA ID"
        });
      }

      console.error(`[POST /api/channels] Erro inesperado ao criar canal:`, {
        error: error.message,
        stack: error.stack,
        requestData: {
          name: req.body.name,
          phoneNumber: req.body.phoneNumber,
          hasWabaId: !!req.body.wabaId,
          hasAccessToken: !!req.body.accessToken
        }
      });

      res.status(400).json({ 
        error: "Erro ao criar canal", 
        details: error.message || "Erro interno do servidor"
      });
    }
  });

  app.put("/api/channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertChannelSchema.partial().parse(req.body);
      
      const updatedChannel = await storage.updateChannel(id, validatedData);
      
      if (!updatedChannel) {
        return res.status(404).json({ error: "Canal não encontrado" });
      }

      res.json(updatedChannel);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar canal" });
    }
  });

  app.delete("/api/channels/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteChannel(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Canal não encontrado" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar canal" });
    }
  });

  // Contacts routes
  app.get("/api/contacts", async (req, res) => {
    try {
      const { search, status } = req.query;
      const contacts = await storage.getContacts(
        search as string, 
        status as string
      );
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar contatos" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      
      // Check if contact already exists
      const existing = await storage.getContactByPhoneNumber(validatedData.phoneNumber);
      if (existing) {
        return res.status(400).json({ error: "Contato com este número já existe" });
      }

      const contact = await storage.createContact(validatedData);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar contato" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertContactSchema.partial().parse(req.body);
      
      const updatedContact = await storage.updateContact(id, validatedData);
      
      if (!updatedContact) {
        return res.status(404).json({ error: "Contato não encontrado" });
      }

      res.json(updatedContact);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar contato" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteContact(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Contato não encontrado" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar contato" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      const { channelId, contactId, limit } = req.query;
      const messages = await storage.getMessages(
        channelId ? parseInt(channelId as string) : undefined,
        contactId ? parseInt(contactId as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Get channel and contact
      const channel = await storage.getChannel(validatedData.channelId);
      const contact = await storage.getContact(validatedData.contactId);
      
      if (!channel || !contact) {
        return res.status(400).json({ error: "Canal ou contato não encontrado" });
      }

      if (channel.status !== "connected") {
        return res.status(400).json({ error: "Canal não está conectado" });
      }

      // Create message record
      const message = await storage.createMessage({
        channelId: validatedData.channelId,
        contactId: validatedData.contactId,
        type: validatedData.type,
        content: validatedData.content,
        templateName: validatedData.templateName,
        templateParams: validatedData.templateParams,
        direction: "outbound",
      });

      // Send via WhatsApp API
      const whatsapp = new WhatsAppAPI(channel.accessToken);
      
      try {
        let result;
        
        if (validatedData.type === "template" && validatedData.templateName) {
          const params = typeof validatedData.templateParams === 'object' && validatedData.templateParams !== null 
            ? validatedData.templateParams as { [key: string]: string }
            : {};
          result = await whatsapp.sendTemplate(
            contact.phoneNumber,
            validatedData.templateName,
            params
          );
        } else {
          result = await whatsapp.sendMessage(
            contact.phoneNumber,
            validatedData.content
          );
        }

        // Update message with WhatsApp message ID
        await storage.updateMessageStatus(message.id, "sent", {
          messageId: result.messageId
        });

        res.status(201).json({ ...message, messageId: result.messageId });
      } catch (whatsappError: any) {
        // Update message with error
        await storage.updateMessageStatus(message.id, "failed", {
          errorMessage: whatsappError.message
        });
        
        res.status(400).json({ 
          error: "Falha ao enviar mensagem", 
          details: whatsappError.message 
        });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar mensagem" });
    }
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const validatedData = insertTemplateSchema.parse(req.body);
      
      // Check if template name already exists
      const existing = await storage.getTemplateByName(validatedData.name);
      if (existing) {
        return res.status(400).json({ error: "Template com este nome já existe" });
      }

      const template = await storage.createTemplate(validatedData);
      res.status(201).json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar template" });
    }
  });

  // Stats routes
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getMessageStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value, description } = req.body;
      
      if (!key || !value) {
        return res.status(400).json({ error: "Chave e valor são obrigatórios" });
      }

      const setting = await storage.setSetting(key, value, description);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configuração" });
    }
  });

  // API Tokens routes
  app.get("/api/tokens", async (req, res) => {
    try {
      const tokens = await storage.getApiTokens();
      // Remove sensitive token data from response
      const safeTokens = tokens.map(token => ({
        ...token,
        token: `${token.token.substring(0, 8)}...${token.token.substring(token.token.length - 4)}`
      }));
      res.json(safeTokens);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar tokens" });
    }
  });

  app.post("/api/tokens", async (req, res) => {
    try {
      const { name, defaultChannelId } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Nome do token é obrigatório" });
      }

      const result = await storage.createApiToken({ name, defaultChannelId });
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar token" });
    }
  });

  app.delete("/api/tokens/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteApiToken(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Token não encontrado" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao deletar token" });
    }
  });

  // Webhook route for WhatsApp
  app.get("/api/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Verify webhook
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN || "whatsapp_webhook_token";
    
    if (mode === "subscribe" && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  });

  app.post("/api/webhook", async (req, res) => {
    try {
      const body = req.body;
      
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.field === "messages") {
              await processIncomingMessage(change.value);
            }
          }
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Erro ao processar webhook" });
    }
  });

  // External API routes (with authentication)
  app.post("/api/external/send-message", authenticateApiToken, async (req, res) => {
    try {
      const { to, message, template, template_params } = req.body;
      
      if (!to || (!message && !template)) {
        return res.status(400).json({ 
          error: "Parâmetros 'to' e 'message' ou 'template' são obrigatórios" 
        });
      }

      // Get or create contact
      let contact = await storage.getContactByPhoneNumber(to);
      if (!contact) {
        contact = await storage.createContact({
          name: `Contato ${to}`,
          phoneNumber: to,
        });
      }

      // Get default channel or use API token's default channel
      let channelId = (req as any).apiToken.defaultChannelId;
      if (!channelId) {
        const channels = await storage.getChannels();
        const connectedChannel = channels.find(c => c.status === "connected");
        if (!connectedChannel) {
          return res.status(400).json({ error: "Nenhum canal conectado disponível" });
        }
        channelId = connectedChannel.id;
      }

      // Create and send message
      const messageData = {
        channelId,
        contactId: contact.id,
        type: template ? "template" : "text",
        content: message || `Template: ${template}`,
        templateName: template,
        templateParams: template_params,
      };

      const newMessage = await storage.createMessage({
        ...messageData,
        direction: "outbound",
      });

      // Send via WhatsApp API
      const channel = await storage.getChannel(channelId);
      const whatsapp = new WhatsAppAPI(channel!.accessToken);
      
      let result;
      if (template) {
        result = await whatsapp.sendTemplate(to, template, template_params || {});
      } else {
        result = await whatsapp.sendMessage(to, message);
      }

      await storage.updateMessageStatus(newMessage.id, "sent", {
        messageId: result.messageId
      });

      res.json({
        success: true,
        message_id: result.messageId,
        internal_id: newMessage.id,
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: "Falha ao enviar mensagem", 
        details: error.message 
      });
    }
  });

  // Process incoming webhook messages
  async function processIncomingMessage(value: any) {
    try {
      if (value.messages) {
        for (const message of value.messages) {
          // Find channel by phone number
          const phoneNumber = value.metadata?.phone_number_id;
          if (!phoneNumber) continue;

          const channel = await storage.getChannelByPhoneNumber(phoneNumber);
          if (!channel) continue;

          // Get or create contact
          let contact = await storage.getContactByPhoneNumber(message.from);
          if (!contact) {
            contact = await storage.createContact({
              name: `Contato ${message.from}`,
              phoneNumber: message.from,
            });
          }

          // Create message record
          await storage.createMessage({
            channelId: channel.id,
            contactId: contact.id,
            type: message.type,
            content: message.text?.body || `${message.type} message`,
            direction: "inbound",
            messageId: message.id,
          });

          // Update contact last interaction
          await storage.updateContact(contact.id, {} as any);
        }
      }

      // Process status updates
      if (value.statuses) {
        for (const status of value.statuses) {
          // Update message status based on WhatsApp message ID
          // This would require a more complex query to find the message
          // For now, we'll skip this implementation
        }
      }
    } catch (error) {
      console.error("Error processing incoming message:", error);
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
