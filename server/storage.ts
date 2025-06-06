import { 
  channels, 
  contacts, 
  messages, 
  templates, 
  settings, 
  apiTokens,
  type Channel, 
  type InsertChannel,
  type Contact,
  type InsertContact,
  type Message,
  type InsertMessage,
  type MessageWithRelations,
  type Template,
  type InsertTemplate,
  type Setting,
  type InsertSetting,
  type ApiToken,
  type InsertApiToken,
  type ChannelWithStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, count, sql } from "drizzle-orm";

export interface IStorage {
  // Channels
  getChannels(): Promise<ChannelWithStats[]>;
  getChannel(id: number): Promise<Channel | undefined>;
  getChannelByPhoneNumber(phoneNumber: string): Promise<Channel | undefined>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined>;
  updateChannelStatus(id: number, status: string): Promise<void>;
  deleteChannel(id: number): Promise<boolean>;

  // Contacts
  getContacts(search?: string, status?: string): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  getContactByPhoneNumber(phoneNumber: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, updates: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;

  // Messages
  getMessages(channelId?: number, contactId?: number, limit?: number): Promise<MessageWithRelations[]>;
  getMessage(id: number): Promise<MessageWithRelations | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(id: number, status: string, metadata?: any): Promise<void>;
  getMessageStats(): Promise<{
    sent: number;
    received: number;
    deliveryRate: number;
    totalContacts: number;
  }>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplateByName(name: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, updates: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string, description?: string): Promise<Setting>;
  getSettings(): Promise<Setting[]>;

  // API Tokens
  getApiTokens(): Promise<ApiToken[]>;
  getApiToken(token: string): Promise<ApiToken | undefined>;
  createApiToken(apiToken: InsertApiToken): Promise<{ token: string; apiToken: ApiToken }>;
  updateApiTokenUsage(token: string): Promise<void>;
  deleteApiToken(id: number): Promise<boolean>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Chatbot Rules
  getChatbotRules(channelId?: number): Promise<ChatbotRule[]>;
  getChatbotRule(id: number): Promise<ChatbotRule | undefined>;
  createChatbotRule(rule: InsertChatbotRule): Promise<ChatbotRule>;
  updateChatbotRule(id: number, updates: Partial<InsertChatbotRule>): Promise<ChatbotRule | undefined>;
  deleteChatbotRule(id: number): Promise<boolean>;

  // Scheduled Messages
  getScheduledMessages(status?: string): Promise<ScheduledMessage[]>;
  getScheduledMessage(id: number): Promise<ScheduledMessage | undefined>;
  createScheduledMessage(message: InsertScheduledMessage): Promise<ScheduledMessage>;
  updateScheduledMessage(id: number, updates: Partial<InsertScheduledMessage>): Promise<ScheduledMessage | undefined>;
  deleteScheduledMessage(id: number): Promise<boolean>;

  // Analytics
  getChannelAnalytics(channelId?: number, dateRange?: string): Promise<any>;
  getChatbotAnalytics(channelId?: number, dateRange?: string): Promise<any>;
  getResponseTimeAnalytics(channelId?: number, dateRange?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Channels
  async getChannels(): Promise<ChannelWithStats[]> {
    const channelsWithStats = await db
      .select({
        id: channels.id,
        name: channels.name,
        phoneNumber: channels.phoneNumber,
        wabaId: channels.wabaId,
        accessToken: channels.accessToken,
        status: channels.status,
        lastActivity: channels.lastActivity,
        createdAt: channels.createdAt,
        messageCount: count(messages.id),
      })
      .from(channels)
      .leftJoin(messages, eq(channels.id, messages.channelId))
      .groupBy(channels.id)
      .orderBy(desc(channels.createdAt));

    return channelsWithStats;
  }

  async getChannel(id: number): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async getChannelByPhoneNumber(phoneNumber: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.phoneNumber, phoneNumber));
    return channel || undefined;
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    try {
      console.log(`[DB] Tentando inserir canal:`, {
        name: channel.name,
        phoneNumber: channel.phoneNumber,
        wabaIdPrefix: channel.wabaId?.substring(0, 8) + "...",
        hasAccessToken: !!channel.accessToken
      });

      const [newChannel] = await db
        .insert(channels)
        .values(channel)
        .returning();
      
      console.log(`[DB] Canal inserido com sucesso:`, {
        id: newChannel.id,
        name: newChannel.name,
        phoneNumber: newChannel.phoneNumber
      });
      
      return newChannel;
    } catch (error: any) {
      console.error(`[DB] Erro ao inserir canal no banco:`, {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack
      });
      
      // Re-throw with more context
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`Já existe um canal com este número de telefone: ${channel.phoneNumber}`);
      }
      
      if (error.message.includes('connection')) {
        throw new Error('Erro de conexão com o banco de dados. Tente novamente em alguns segundos.');
      }
      
      throw new Error(`Erro ao salvar canal no banco: ${error.message || 'Erro desconhecido'}`);
    }
  }

  async updateChannel(id: number, updates: Partial<InsertChannel>): Promise<Channel | undefined> {
    const [updatedChannel] = await db
      .update(channels)
      .set(updates)
      .where(eq(channels.id, id))
      .returning();
    return updatedChannel || undefined;
  }

  async updateChannelStatus(id: number, status: string): Promise<void> {
    await db
      .update(channels)
      .set({ status, lastActivity: new Date() })
      .where(eq(channels.id, id));
  }

  async deleteChannel(id: number): Promise<boolean> {
    const result = await db.delete(channels).where(eq(channels.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Contacts
  async getContacts(search?: string, status?: string): Promise<Contact[]> {
    let query = db.select().from(contacts);
    
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(contacts.name, `%${search}%`),
          like(contacts.phoneNumber, `%${search}%`),
          like(contacts.email, `%${search}%`)
        )
      );
    }
    
    if (status && status !== "all") {
      conditions.push(eq(contacts.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(contacts.lastInteraction));
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact || undefined;
  }

  async getContactByPhoneNumber(phoneNumber: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.phoneNumber, phoneNumber));
    return contact || undefined;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateContact(id: number, updates: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updatedContact] = await db
      .update(contacts)
      .set(updates)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact || undefined;
  }

  async deleteContact(id: number): Promise<boolean> {
    const result = await db.delete(contacts).where(eq(contacts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Messages
  async getMessages(channelId?: number, contactId?: number, limit = 50): Promise<MessageWithRelations[]> {
    let query = db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        contactId: messages.contactId,
        type: messages.type,
        content: messages.content,
        templateName: messages.templateName,
        templateParams: messages.templateParams,
        status: messages.status,
        direction: messages.direction,
        messageId: messages.messageId,
        errorMessage: messages.errorMessage,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        channel: {
          id: channels.id,
          name: channels.name,
          phoneNumber: channels.phoneNumber,
          wabaId: channels.wabaId,
          accessToken: channels.accessToken,
          status: channels.status,
          lastActivity: channels.lastActivity,
          createdAt: channels.createdAt,
        },
        contact: {
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
          email: contacts.email,
          status: contacts.status,
          lastInteraction: contacts.lastInteraction,
          metadata: contacts.metadata,
          createdAt: contacts.createdAt,
        },
      })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(contacts, eq(messages.contactId, contacts.id));

    const conditions = [];
    if (channelId) {
      conditions.push(eq(messages.channelId, channelId));
    }
    if (contactId) {
      conditions.push(eq(messages.contactId, contactId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async getMessage(id: number): Promise<MessageWithRelations | undefined> {
    const [message] = await db
      .select({
        id: messages.id,
        channelId: messages.channelId,
        contactId: messages.contactId,
        type: messages.type,
        content: messages.content,
        templateName: messages.templateName,
        templateParams: messages.templateParams,
        status: messages.status,
        direction: messages.direction,
        messageId: messages.messageId,
        errorMessage: messages.errorMessage,
        sentAt: messages.sentAt,
        deliveredAt: messages.deliveredAt,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        channel: {
          id: channels.id,
          name: channels.name,
          phoneNumber: channels.phoneNumber,
          wabaId: channels.wabaId,
          accessToken: channels.accessToken,
          status: channels.status,
          lastActivity: channels.lastActivity,
          createdAt: channels.createdAt,
        },
        contact: {
          id: contacts.id,
          name: contacts.name,
          phoneNumber: contacts.phoneNumber,
          email: contacts.email,
          status: contacts.status,
          lastInteraction: contacts.lastInteraction,
          metadata: contacts.metadata,
          createdAt: contacts.createdAt,
        },
      })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .innerJoin(contacts, eq(messages.contactId, contacts.id))
      .where(eq(messages.id, id));

    return message || undefined;
  }

async createMessage(message: InsertMessage): Promise<Message> {
  try {
    return await db.transaction(async (tx) => {
      // Verificar se o canal existe
      const channel = await tx.query.channels.findFirst({
        where: eq(channels.id, message.channelId)
      });

      if (!channel) {
        throw new Error(`Canal com ID ${message.channelId} não encontrado`);
      }

      // Verificar se o contato existe
      const contact = await tx.query.contacts.findFirst({
        where: eq(contacts.id, message.contactId)
      });

      if (!contact) {
        throw new Error(`Contato com ID ${message.contactId} não encontrado`);
      }

      // Inserir mensagem
      const [newMessage] = await tx.insert(messages)
        .values(message)
        .returning();

      // Atualizar último contato
      await tx.update(contacts)
        .set({ lastInteraction: new Date() })
        .where(eq(contacts.id, message.contactId));

      return newMessage;
    });
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    throw new Error(`Falha ao criar mensagem: ${error.message}`);
  }
}

  async updateMessageStatus(id: number, status: string, metadata?: any): Promise<void> {
    const updates: any = { status };
    
    if (status === "sent") {
      updates.sentAt = new Date();
    } else if (status === "delivered") {
      updates.deliveredAt = new Date();
    } else if (status === "read") {
      updates.readAt = new Date();
    }

    if (metadata?.messageId) {
      updates.messageId = metadata.messageId;
    }

    if (metadata?.errorMessage) {
      updates.errorMessage = metadata.errorMessage;
    }

    await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id));
  }

  async getMessageStats(): Promise<{
    sent: number;
    received: number;
    deliveryRate: number;
    totalContacts: number;
  }> {
    const [sentCount] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.direction, "outbound"));

    const [receivedCount] = await db
      .select({ count: count() })
      .from(messages)
      .where(eq(messages.direction, "inbound"));

    const [deliveredCount] = await db
      .select({ count: count() })
      .from(messages)
      .where(and(
        eq(messages.direction, "outbound"),
        or(
          eq(messages.status, "delivered"),
          eq(messages.status, "read")
        )
      ));

    const [contactCount] = await db
      .select({ count: count() })
      .from(contacts)
      .where(eq(contacts.status, "active"));

    const deliveryRate = sentCount.count > 0 
      ? (deliveredCount.count / sentCount.count) * 100 
      : 0;

    return {
      sent: sentCount.count,
      received: receivedCount.count,
      deliveryRate: Number(deliveryRate.toFixed(1)),
      totalContacts: contactCount.count,
    };
  }

  // Templates
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getTemplateByName(name: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.name, name));
    return template || undefined;
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [newTemplate] = await db
      .insert(templates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: number, updates: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [updatedTemplate] = await db
      .update(templates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate || undefined;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    const result = await db.delete(templates).where(eq(templates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string, description?: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    
    if (existing) {
      const [updatedSetting] = await db
        .update(settings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updatedSetting;
    } else {
      const [newSetting] = await db
        .insert(settings)
        .values({ key, value, description })
        .returning();
      return newSetting;
    }
  }

  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings).orderBy(settings.key);
  }

  // API Tokens
  async getApiTokens(): Promise<ApiToken[]> {
    return await db.select().from(apiTokens).orderBy(desc(apiTokens.createdAt));
  }

  async getApiToken(token: string): Promise<ApiToken | undefined> {
    const [apiToken] = await db.select().from(apiTokens).where(eq(apiTokens.token, token));
    return apiToken || undefined;
  }

  async createApiToken(insertToken: InsertApiToken): Promise<{ token: string; apiToken: ApiToken }> {
    // Generate a secure token
    const token = `waba_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const [newApiToken] = await db
      .insert(apiTokens)
      .values({ ...insertToken, token })
      .returning();
    
    return { token, apiToken: newApiToken };
  }

  async updateApiTokenUsage(token: string): Promise<void> {
    await db
      .update(apiTokens)
      .set({ lastUsed: new Date() })
      .where(eq(apiTokens.token, token));
  }

  async deleteApiToken(id: number): Promise<boolean> {
    const result = await db.delete(apiTokens).where(eq(apiTokens.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
