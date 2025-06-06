// whatsapp-api.js
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export class WhatsAppAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://graph.facebook.com/v19.0';
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async validateConnection(wabaId) {
    try {
      const response = await this.axios.get(`/${wabaId}`);
      return response.data && response.data.id === wabaId;
    } catch (error) {
      console.error('Erro na validação de conexão:', error.response?.data || error.message);
      return false;
    }
  }

  async getAccountInfo(wabaId) {
    try {
      const response = await this.axios.get(`/${wabaId}`, {
        params: {
          fields: 'name,id,message_template_namespace,timezone_offset_min'
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Falha ao obter informações da conta: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getTemplates(wabaId) {
    try {
      const response = await this.axios.get(`/${wabaId}/message_templates`, {
        params: {
          fields: 'name,id,category,language,status,components'
        }
      });
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Falha ao buscar templates: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}
