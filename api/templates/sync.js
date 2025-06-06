// api/templates/sync.js
import express from 'express';
import { WhatsAppAPI } from '../../whatsapp-api.js';


const router = express.Router();

router.post('/', async (req, res) => {
  try {
    // Verifica variáveis de ambiente necessárias
    const requiredEnvVars = [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_BUSINESS_ID',
      'WHATSAPP_PHONE_NUMBER_ID'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Variável de ambiente ${envVar} não está configurada`);
      }
    }

    const whatsapp = new WhatsAppAPI(process.env.WHATSAPP_ACCESS_TOKEN);
    const wabaId = process.env.WHATSAPP_BUSINESS_ID;

    // 1. Valida conexão com a API
    const isConnected = await whatsapp.validateConnection(wabaId);
    if (!isConnected) {
      throw new Error('Falha na conexão com a API do WhatsApp');
    }

    // 2. Busca templates da API do WhatsApp
    const whatsappTemplates = await whatsapp.getTemplates(wabaId);

    // 3. Sincroniza com o banco de dados local
    const syncResults = {
      created: 0,
      updated: 0,
      skipped: 0,
      total: whatsappTemplates.length,
    };

    for (const template of whatsappTemplates) {
      try {
        // Verifica se o template já existe
        const existingTemplate = await Template.findOne({ whatsappId: template.id });

        if (existingTemplate) {
          // Atualiza template existente
          existingTemplate.name = template.name;
          existingTemplate.category = template.category;
          existingTemplate.language = template.language;
          existingTemplate.status = template.status;
          existingTemplate.components = template.components;
          existingTemplate.lastSynced = new Date();
          
          await existingTemplate.save();
          syncResults.updated++;
        } else {
          // Cria novo template
          const newTemplate = new Template({
            whatsappId: template.id,
            name: template.name,
            displayName: template.name, // Pode ajustar conforme necessário
            category: template.category,
            language: template.language,
            status: template.status,
            components: template.components,
            content: this.extractTextFromComponents(template.components),
            lastSynced: new Date(),
          });

          await newTemplate.save();
          syncResults.created++;
        }
      } catch (error) {
        console.error(`Erro ao processar template ${template.id}:`, error);
        syncResults.skipped++;
      }
    }

    res.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      results: syncResults,
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erro ao sincronizar templates',
    });
  }
});

// Helper para extrair texto dos componentes do template
function extractTextFromComponents(components) {
  if (!components || !Array.isArray(components)) return '';

  const bodyComponent = components.find(c => c.type === 'BODY');
  if (bodyComponent && bodyComponent.text) {
    return bodyComponent.text;
  }

  return '';
}

export default router;
