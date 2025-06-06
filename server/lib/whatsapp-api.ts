import axios, { AxiosInstance, AxiosError } from "axios";
import retry from 'async-retry';
//
export interface WhatsAppMessage {
  to: string;
  text: {
    body: string;
  };
  type: "text";
}

export interface WhatsAppTemplate {
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppMedia {
  to: string;
  type: "image" | "video" | "document" | "audio";
  [key: string]: any;
}

export interface SendMessageResponse {
  messageId: string;
  success: boolean;
  timestamp?: number;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  timezone_offset_min: number;
  message_template_namespace: string;
}

export interface WhatsAppPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
}

export class WhatsAppAPI {
  private client: AxiosInstance;
  private baseURL = "https://graph.facebook.com/v18.0";
  private retryConfig = {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 5000,
    onRetry: (error: AxiosError) => {
      console.warn(`[WhatsApp API] Tentativa falhou, tentando novamente...`, {
        status: error.response?.status,
        url: error.config?.url,
        error: error.message
      });
    }
  };

  constructor(private accessToken: string, private defaultPhoneNumberId?: string) {
    if (!accessToken) {
      throw new Error("Access Token é obrigatório");
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 15000, // 15 segundos
      maxContentLength: 50 * 1024 * 1024, // 50MB para uploads de mídia
    });

    console.log('[WhatsApp API] Cliente configurado', {
      baseURL: this.baseURL,
      defaultPhoneNumberId: this.defaultPhoneNumberId?.substring(0, 4) + '...'
    });
  }

  /**
   * Valida a conexão com a API do WhatsApp Business
   */
  async validateConnection(wabaId: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp API] Validando conexão para WABA ID: ${wabaId?.substring(0, 8)}...`);
      
      const response = await this.client.get(`/${wabaId}`, {
        params: {
          fields: 'id,name'
        }
      });
      
      if (response.status === 200 && response.data?.id === wabaId) {
        console.log(`[WhatsApp API] Conexão validada com sucesso para WABA ID: ${wabaId?.substring(0, 8)}...`);
        return true;
      }
      
      console.warn(`[WhatsApp API] Resposta inesperada na validação:`, {
        status: response.status,
        data: response.data
      });
      return false;
    } catch (error: any) {
      this.handleApiError(error, 'validateConnection');
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendMessage(to: string, message: string, phoneNumberId?: string): Promise<SendMessageResponse> {
    return retry(async (bail) => {
      try {
        const cleanTo = this.sanitizePhoneNumber(to);
        const fromPhoneNumberId = phoneNumberId || this.defaultPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (!fromPhoneNumberId) {
          throw new Error("Phone Number ID não configurado");
        }

        const payload: WhatsAppMessage = {
          to: cleanTo,
          type: "text",
          text: {
            body: message,
          },
        };

        console.log('[WhatsApp API] Enviando mensagem de texto', {
          to: cleanTo,
          from: fromPhoneNumberId.substring(0, 4) + '...',
          length: message.length
        });

        const response = await this.client.post(`/${fromPhoneNumberId}/messages`, payload);

        if (response.data?.messages?.[0]?.id) {
          const result: SendMessageResponse = {
            messageId: response.data.messages[0].id,
            success: true,
            timestamp: response.data.messages[0].timestamp
          };

          console.log('[WhatsApp API] Mensagem enviada com sucesso', {
            messageId: result.messageId,
            timestamp: result.timestamp
          });

          return result;
        }

        throw new Error("Resposta inválida da API do WhatsApp");
      } catch (error: any) {
        if (this.shouldBail(error)) {
          bail(error);
          return;
        }
        throw error;
      }
    }, this.retryConfig);
  }

  /**
   * Envia uma mensagem de template
   */
  async sendTemplate(
    to: string, 
    templateName: string, 
    parameters: { [key: string]: string } = {},
    language = "pt_BR",
    phoneNumberId?: string
  ): Promise<SendMessageResponse> {
    return retry(async (bail) => {
      try {
        const cleanTo = this.sanitizePhoneNumber(to);
        const fromPhoneNumberId = phoneNumberId || this.defaultPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (!fromPhoneNumberId) {
          throw new Error("Phone Number ID não configurado");
        }

        const templateParameters = Object.entries(parameters)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([_, value]) => ({
            type: "text",
            text: value,
          }));

        const payload: WhatsAppTemplate = {
          to: cleanTo,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: language,
            },
          },
        };

        if (templateParameters.length > 0) {
          payload.template.components = [{
            type: "body",
            parameters: templateParameters,
          }];
        }

        console.log('[WhatsApp API] Enviando template', {
          to: cleanTo,
          from: fromPhoneNumberId.substring(0, 4) + '...',
          templateName,
          parameters: Object.keys(parameters)
        });

        const response = await this.client.post(`/${fromPhoneNumberId}/messages`, payload);

        if (response.data?.messages?.[0]?.id) {
          const result: SendMessageResponse = {
            messageId: response.data.messages[0].id,
            success: true,
            timestamp: response.data.messages[0].timestamp
          };

          console.log('[WhatsApp API] Template enviado com sucesso', {
            messageId: result.messageId,
            templateName
          });

          return result;
        }

        throw new Error("Resposta inválida da API do WhatsApp");
      } catch (error: any) {
        if (this.shouldBail(error)) {
          bail(error);
          return;
        }
        throw error;
      }
    }, this.retryConfig);
  }

  /**
   * Obtém informações da conta WhatsApp Business
   */
  async getAccountInfo(wabaId: string): Promise<WhatsAppBusinessAccount> {
    try {
      const response = await this.client.get(`/${wabaId}`, {
        params: {
          fields: "id,name,timezone_offset_min,message_template_namespace",
        },
      });
      
      return response.data;
    } catch (error: any) {
      this.handleApiError(error, 'getAccountInfo');
      throw error;
    }
  }

  /**
   * Obtém números de telefone associados à WABA
   */
  async getPhoneNumbers(wabaId: string): Promise<WhatsAppPhoneNumber[]> {
    try {
      const response = await this.client.get(`/${wabaId}/phone_numbers`);
      return response.data.data || [];
    } catch (error: any) {
      this.handleApiError(error, 'getPhoneNumbers');
      throw error;
    }
  }

  /**
   * Obtém templates de mensagem
   */
  async getTemplates(wabaId: string): Promise<WhatsAppTemplate[]> {
    try {
      const response = await this.client.get(`/${wabaId}/message_templates`, {
        params: {
          fields: "id,name,status,category,language",
        },
      });
      
      return response.data.data || [];
    } catch (error: any) {
      this.handleApiError(error, 'getTemplates');
      throw error;
    }
  }

  /**
   * Marca mensagem como lida
   */
  async markMessageAsRead(messageId: string, phoneNumberId?: string): Promise<boolean> {
    try {
      const fromPhoneNumberId = phoneNumberId || this.defaultPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      
      if (!fromPhoneNumberId) {
        throw new Error("Phone Number ID não configurado");
      }

      const payload = {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      };

      await this.client.post(`/${fromPhoneNumberId}/messages`, payload);
      return true;
    } catch (error: any) {
      this.handleApiError(error, 'markMessageAsRead');
      throw error;
    }
  }

  /**
   * Obtém URL de mídia
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    try {
      const response = await this.client.get(`/${mediaId}`);
      return response.data.url;
    } catch (error: any) {
      this.handleApiError(error, 'getMediaUrl');
      throw error;
    }
  }

  /**
   * Faz download de mídia
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    try {
      const response = await this.client.get(mediaUrl, {
        responseType: "arraybuffer",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
        },
      });
      
      return Buffer.from(response.data);
    } catch (error: any) {
      this.handleApiError(error, 'downloadMedia');
      throw error;
    }
  }

  /**
   * Envia uma mensagem de mídia
   */
  async sendMedia(
    to: string,
    type: "image" | "video" | "document" | "audio",
    mediaIdOrUrl: string,
    caption?: string,
    phoneNumberId?: string
  ): Promise<SendMessageResponse> {
    return retry(async (bail) => {
      try {
        const cleanTo = this.sanitizePhoneNumber(to);
        const fromPhoneNumberId = phoneNumberId || this.defaultPhoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (!fromPhoneNumberId) {
          throw new Error("Phone Number ID não configurado");
        }

        const payload: WhatsAppMedia = {
          to: cleanTo,
          type,
          [type]: {
            id: mediaIdOrUrl,
            ...(caption && { caption })
          }
        };

        console.log('[WhatsApp API] Enviando mídia', {
          to: cleanTo,
          type,
          hasCaption: !!caption
        });

        const response = await this.client.post(`/${fromPhoneNumberId}/messages`, payload);

        if (response.data?.messages?.[0]?.id) {
          const result: SendMessageResponse = {
            messageId: response.data.messages[0].id,
            success: true,
            timestamp: response.data.messages[0].timestamp
          };

          console.log('[WhatsApp API] Mídia enviada com sucesso', {
            messageId: result.messageId,
            type
          });

          return result;
        }

        throw new Error("Resposta inválida da API do WhatsApp");
      } catch (error: any) {
        if (this.shouldBail(error)) {
          bail(error);
          return;
        }
        throw error;
      }
    }, this.retryConfig);
  }

  /**
   * Métodos auxiliares
   */

  private sanitizePhoneNumber(phoneNumber: string): string {
    // Remove todos os caracteres não numéricos e o prefixo '+'
    return phoneNumber.replace(/[^\d]/g, "");
  }

  private handleApiError(error: any, context: string): void {
    const errorData = {
      context,
      status: error.response?.status,
      errorCode: error.response?.data?.error?.code,
      errorMessage: error.response?.data?.error?.message,
      errorType: error.response?.data?.error?.type,
      details: error.response?.data?.error?.error_data?.details
    };

    console.error('[WhatsApp API Error]', errorData);

    if (error.response?.data?.error) {
      const whatsappError = error.response.data.error;
      throw new Error(`WhatsApp API Error [${whatsappError.code}]: ${whatsappError.message}`);
    }

    throw new Error(`Erro na comunicação com WhatsApp API: ${error.message}`);
  }

  private shouldBail(error: AxiosError): boolean {
    // Não tentar novamente para erros 4xx (exceto 429 - Too Many Requests)
    if (error.response?.status && 
        error.response.status >= 400 && 
        error.response.status < 500 &&
        error.response.status !== 429) {
      return true;
    }
    return false;
  }
}
