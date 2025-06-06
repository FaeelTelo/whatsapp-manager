import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date, primaryKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
const statusEnum = ['active', 'inactive', 'blocked'] as const;
const messageStatusEnum = ['pending', 'sent', 'delivered', 'read', 'failed'] as const;
const directionEnum = ['inbound', 'outbound'] as const;
const templateCategoryEnum = ['marketing', 'transactional', 'support', 'utility'] as const;

// Tables
export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  wabaId: text("waba_id").notNull(),
  accessToken: text("access_token").notNull(),
  status: text("status").notNull().default("disconnected"),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  email: text("email"),
  lastInteraction: timestamp("last_interaction"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  contactId: integer("contact_id").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  templateName: text("template_name"),
  templateParams: jsonb("template_params"),
  status: text("status").notNull().default("pending"),
  direction: text("direction").notNull(),
  messageId: text("message_id"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  channelIdx: index("channel_idx").on(table.channelId),
  contactIdx: index("contact_idx").on(table.contactId),
  statusIdx: index("status_idx").on(table.status),
}));

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  category: text("category").notNull(),
  language: text("language").notNull().default("pt_BR"),
  status: text("status").notNull().default("pending"),
  content: text("content").notNull(),
  parameters: jsonb("parameters"),
  metaTemplateId: text("meta_template_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  defaultChannelId: integer("default_channel_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  permissions: text("permissions").array().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatbotRules = pgTable("chatbot_rules", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  trigger: varchar("trigger", { length: 255 }).notNull(),
  triggerType: varchar("trigger_type", { length: 50 }).default("keyword").notNull(),
  response: text("response").notNull(),
  responseType: varchar("response_type", { length: 50 }).default("text").notNull(),
  templateId: integer("template_id").references(() => templates.id),
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(1).notNull(),
  conditions: jsonb("conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduledMessages = pgTable("scheduled_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id, { onDelete: "cascade" }).notNull(),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 50 }).default("text").notNull(),
  templateId: integer("template_id").references(() => templates.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelAnalytics = pgTable("channel_analytics", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  messagesSent: integer("messages_sent").default(0).notNull(),
  messagesReceived: integer("messages_received").default(0).notNull(),
  messagesDelivered: integer("messages_delivered").default(0).notNull(),
  messagesFailed: integer("messages_failed").default(0).notNull(),
  uniqueContacts: integer("unique_contacts").default(0).notNull(),
  averageResponseTime: integer("average_response_time"),
  chatbotActivations: integer("chatbot_activations").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const channelsRelations = relations(channels, ({ many }) => ({
  messages: many(messages),
  apiTokens: many(apiTokens),
  chatbotRules: many(chatbotRules),
  scheduledMessages: many(scheduledMessages),
  channelAnalytics: many(channelAnalytics),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  messages: many(messages),
  scheduledMessages: many(scheduledMessages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  contact: one(contacts, {
    fields: [messages.contactId],
    references: [contacts.id],
  }),
}));

export const apiTokensRelations = relations(apiTokens, ({ one }) => ({
  defaultChannel: one(channels, {
    fields: [apiTokens.defaultChannelId],
    references: [channels.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  scheduledMessages: many(scheduledMessages),
}));

export const chatbotRulesRelations = relations(chatbotRules, ({ one }) => ({
  channel: one(channels, {
    fields: [chatbotRules.channelId],
    references: [channels.id],
  }),
  template: one(templates, {
    fields: [chatbotRules.templateId],
    references: [templates.id],
  }),
}));

export const scheduledMessagesRelations = relations(scheduledMessages, ({ one }) => ({
  channel: one(channels, {
    fields: [scheduledMessages.channelId],
    references: [channels.id],
  }),
  contact: one(contacts, {
    fields: [scheduledMessages.contactId],
    references: [contacts.id],
  }),
  template: one(templates, {
    fields: [scheduledMessages.templateId],
    references: [templates.id],
  }),
  createdBy: one(users, {
    fields: [scheduledMessages.createdBy],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertChannelSchema = createInsertSchema(channels).pick({
  name: true,
  phoneNumber: true,
  wabaId: true,
  accessToken: true,
});

export const insertContactSchema = createInsertSchema(contacts, {
  name: z.string().min(2).max(100),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Número de telefone inválido"),
  email: z.string().email().optional().or(z.literal("")),
}).omit({ 
  id: true,
  createdAt: true,
  lastInteraction: true,
  metadata: true 
});

export const updateContactSchema = insertContactSchema.partial();

export const insertMessageSchema = createInsertSchema(messages, {
  type: z.enum(["text", "template", "image", "video", "audio", "document"]),
  status: z.enum(messageStatusEnum).optional(),
  direction: z.enum(directionEnum).optional(),
}).extend({
  templateName: z.string().optional().refine((val, ctx) => {
    if (ctx.parent.type === "template" && !val) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Template name é obrigatório para mensagens de template",
      });
    }
    return true;
  }),
}).omit({ 
  id: true,
  createdAt: true,
  sentAt: true,
  deliveredAt: true,
  readAt: true,
  errorMessage: true 
});

export const insertTemplateSchema = createInsertSchema(templates, {
  name: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  category: z.enum(templateCategoryEnum),
  language: z.string().length(5),
}).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  metaTemplateId: true 
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  description: true,
});

export const insertApiTokenSchema = createInsertSchema(apiTokens).pick({
  name: true,
  defaultChannelId: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true,
  permissions: true,
});

export const insertChatbotRuleSchema = createInsertSchema(chatbotRules).pick({
  channelId: true,
  name: true,
  trigger: true,
  triggerType: true,
  response: true,
  responseType: true,
  templateId: true,
  priority: true,
  conditions: true,
});

export const insertScheduledMessageSchema = createInsertSchema(scheduledMessages).pick({
  channelId: true,
  contactId: true,
  content: true,
  messageType: true,
  templateId: true,
  scheduledFor: true,
});

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = insertUserSchema.extend({
  passwordConfirmation: z.string(),
}).refine(data => data.password === data.passwordConfirmation, {
  message: "Senhas não coincidem",
  path: ["passwordConfirmation"],
});

// Validation Schemas
export const chatbotRuleSchema = z.object({
  channelId: z.number(),
  name: z.string().min(1),
  trigger: z.string().min(1),
  triggerType: z.enum(["keyword", "regex", "time"]),
  response: z.string().min(1),
  responseType: z.enum(["text", "template"]),
  templateId: z.number().optional(),
  priority: z.number().min(1).max(10),
});

export const scheduledMessageSchema = z.object({
  channelId: z.number(),
  contactId: z.number().optional(),
  content: z.string().min(1),
  messageType: z.enum(["text", "template"]),
  templateId: z.number().optional(),
  scheduledFor: z.string().refine((date) => new Date(date) > new Date(), {
    message: "Data deve ser no futuro",
  }),
});

// Types
export type Channel = typeof channels.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type ApiToken = typeof apiTokens.$inferSelect;
export type User = typeof users.$inferSelect;
export type ChatbotRule = typeof chatbotRules.$inferSelect;
export type ScheduledMessage = typeof scheduledMessages.$inferSelect;
export type ChannelAnalytics = typeof channelAnalytics.$inferSelect;

export type ChannelWithRelations = Channel & {
  messages: Message[];
  analytics: ChannelAnalytics[];
};

export type ContactWithMessages = Contact & {
  messages: Message[];
};

export type MessageWithRelations = Message & {
  channel: Channel;
  contact: Contact;
};

export type ChannelWithStats = Channel & {
  messageCount?: number;
  lastMessage?: Message;
};

export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChatbotRule = z.infer<typeof insertChatbotRuleSchema>;
export type InsertScheduledMessage = z.infer<typeof insertScheduledMessageSchema>;
