export interface TutorialCodeExample {
  label: string;
  language: 'http' | 'json' | 'bash' | 'javascript' | 'java';
  code: string;
}

export interface TutorialSection {
  titulo: string;
  paragrafos?: string[];
  lista?: string[];
  exemplos?: TutorialCodeExample[];
  dica?: string;
}

export interface TutorialTopico {
  id: string;
  titulo: string;
  resumo: string;
  secoes: TutorialSection[];
}

export const TUTORIAL_TOPICOS: TutorialTopico[] = [
  {
    id: 'visao-geral',
    titulo: 'Visão geral',
    resumo: 'Como integrar outra API ou sistema externo com a Notificação API.',
    secoes: [
      {
        titulo: 'O que é a integração M2M',
        paragrafos: [
          'A Notificação API permite que sistemas externos (ERP, CRM, OrcaFacil, scripts, etc.) enviem mensagens sem login de usuário no painel.',
          'O fluxo típico é: criar uma API Key na organização → configurar a chave no sistema externo → chamar os endpoints com o header X-API-KEY.',
          'As mensagens entram na fila da organização e são processadas conforme as políticas de WhatsApp, e-mail e demais canais habilitados.',
        ],
      },
      {
        titulo: 'Base URL',
        paragrafos: [
          'Todos os exemplos usam a URL base configurada no ambiente. Em desenvolvimento costuma ser http://localhost:8086/api.',
          'Os endpoints de integração ficam sob o prefixo /app/.',
        ],
        exemplos: [
          {
            label: 'Padrão de URL',
            language: 'bash',
            code: '{API_URL}/app/notificacoes/enviar',
          },
        ],
      },
      {
        titulo: 'Canais disponíveis',
        lista: [
          'WHATSAPP — mensagens de texto via sessão conectada no painel',
          'EMAIL — envio por e-mail (quando habilitado no plano e nas configurações)',
          'TELEGRAM — canal Telegram (quando habilitado globalmente)',
          'WEBHOOK — encaminhamento para URL externa configurada',
        ],
        dica: 'O campo canal no request deve ser exatamente um desses valores em maiúsculas.',
      },
    ],
  },
  {
    id: 'autenticacao',
    titulo: 'Autenticação com API Key',
    resumo: 'Como criar, configurar e usar a chave de integração.',
    secoes: [
      {
        titulo: 'Criar a API Key',
        paragrafos: [
          'No painel, acesse Configurações → API Keys (perfil ADMIN da organização).',
          'Ao criar, copie o campo chave — ele é exibido apenas uma vez.',
          'Use sempre a chave completa no formato nak_prefixo.segredo, nunca só o prefixo.',
        ],
        lista: [
          'NOTIFICACOES_ENVIAR — obrigatório para enviar mensagens',
          'NOTIFICACOES_CONSULTAR — consultar fila e histórico',
          'CONTATOS_GERENCIAR — registrar consentimento ou bloquear contatos',
          'TEMPLATES_CONSULTAR / TEMPLATES_GERENCIAR — gerenciar templates via API',
        ],
      },
      {
        titulo: 'Header de autenticação',
        exemplos: [
          {
            label: 'Header obrigatório',
            language: 'http',
            code: 'X-API-KEY: nak_wLku5PjG.sua_chave_completa_aqui',
          },
          {
            label: 'Exemplo cURL',
            language: 'bash',
            code: `curl -X POST "{API_URL}/app/notificacoes/enviar" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: nak_prefixo.segredo" \\
  -d '{"canal":"WHATSAPP","destinatario":"5571999999999","assunto":"Teste","mensagem":"Olá!"}'`,
          },
        ],
        dica: 'JWT (Authorization: Bearer) é usado pelo painel web. Para integração entre APIs, prefira sempre API Key.',
      },
    ],
  },
  {
    id: 'envio-whatsapp',
    titulo: 'Enviar WhatsApp',
    resumo: 'Request e response do envio direto de mensagem de texto.',
    secoes: [
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'POST /app/notificacoes/enviar',
          },
        ],
      },
      {
        titulo: 'Request body',
        paragrafos: [
          'O destinatário deve ser o telefone em formato internacional, apenas dígitos (ex.: 5571999999999).',
          'A sessão WhatsApp da organização precisa estar conectada no painel.',
          'Se a organização exige consentimento, registre o contato antes do envio (veja tópico Consentimento).',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "canal": "WHATSAPP",
  "destinatario": "5571999999999",
  "assunto": "Orçamento disponível",
  "mensagem": "Olá! Seu orçamento está pronto. Acesse o link para visualizar."
}`,
          },
        ],
      },
      {
        titulo: 'Response (sucesso)',
        paragrafos: [
          'sucesso: true indica que a mensagem foi aceita e enfileirada.',
          'status PENDENTE significa que aguarda processamento na fila.',
          'tempoEstimadoEnvioTexto e posicaoFila ajudam a informar o usuário final sobre a previsão de entrega.',
        ],
        exemplos: [
          {
            label: 'JSON — 200 OK',
            language: 'json',
            code: `{
  "sucesso": true,
  "idNotificacao": 42,
  "canal": "WHATSAPP",
  "status": "PENDENTE",
  "erro": null,
  "tempoEstimadoEnvioSegundos": 45,
  "posicaoFila": 2,
  "tempoEstimadoEnvioTexto": "cerca de 45 segundos"
}`,
          },
        ],
      },
      {
        titulo: 'Response (erro)',
        exemplos: [
          {
            label: 'JSON — falha na validação',
            language: 'json',
            code: `{
  "sucesso": false,
  "idNotificacao": null,
  "canal": "WHATSAPP",
  "status": "BLOQUEADA",
  "erro": "Contato sem consentimento para WhatsApp",
  "tempoEstimadoEnvioSegundos": null,
  "posicaoFila": null,
  "tempoEstimadoEnvioTexto": null
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'envio-email',
    titulo: 'Enviar E-mail',
    resumo: 'Mesmo endpoint, canal EMAIL.',
    secoes: [
      {
        titulo: 'Request body',
        paragrafos: [
          'Use o mesmo endpoint POST /app/notificacoes/enviar, alterando apenas o canal e o destinatário.',
          'destinatario deve ser um endereço de e-mail válido.',
          'assunto é usado como título do e-mail; mensagem como corpo.',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "canal": "EMAIL",
  "destinatario": "cliente@empresa.com",
  "assunto": "Confirmação de cadastro",
  "mensagem": "Seu cadastro foi realizado com sucesso.\\n\\nEquipe de suporte"
}`,
          },
        ],
      },
      {
        titulo: 'Response',
        exemplos: [
          {
            label: 'JSON — 200 OK',
            language: 'json',
            code: `{
  "sucesso": true,
  "idNotificacao": 43,
  "canal": "EMAIL",
  "status": "PENDENTE",
  "erro": null,
  "tempoEstimadoEnvioSegundos": 10,
  "posicaoFila": 0,
  "tempoEstimadoEnvioTexto": "cerca de 10 segundos"
}`,
          },
        ],
        dica: 'O canal de e-mail precisa estar habilitado no plano da organização e nas configurações globais da plataforma.',
      },
    ],
  },
  {
    id: 'envio-template',
    titulo: 'Enviar com template',
    resumo: 'Mensagens padronizadas com variáveis substituíveis.',
    secoes: [
      {
        titulo: 'Quando usar',
        paragrafos: [
          'Templates permitem padronizar mensagens e alterar o texto sem redeploy do sistema externo.',
          'Cadastre o template no painel (Templates) e use a chave (templateKey) na integração.',
        ],
      },
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'POST /app/notificacoes/templates/enviar',
          },
        ],
      },
      {
        titulo: 'Request body',
        paragrafos: [
          'templateKey é a chave única do template na organização.',
          'variaveis é um mapa chave → valor. Cada {{nome}} no template corresponde a variaveis.nome.',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "templateKey": "orcamento_disponivel",
  "destinatario": "5571999999999",
  "variaveis": {
    "nomeCliente": "Maria",
    "numeroOrcamento": "ORC-2026-001",
    "valorTotal": "R$ 1.250,00",
    "linkOrcamento": "https://app.exemplo.com/orcamento/abc123"
  }
}`,
          },
        ],
      },
      {
        titulo: 'Response',
        exemplos: [
          {
            label: 'JSON — 200 OK',
            language: 'json',
            code: `{
  "sucesso": true,
  "idNotificacao": 44,
  "canal": "WHATSAPP",
  "status": "PENDENTE",
  "erro": null,
  "tempoEstimadoEnvioSegundos": 30,
  "posicaoFila": 1,
  "tempoEstimadoEnvioTexto": "cerca de 30 segundos"
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'consentimento',
    titulo: 'Consentimento de contatos',
    resumo: 'Autorizar envio WhatsApp quando a política da organização exige.',
    secoes: [
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'POST /app/contatos/consentimento',
          },
        ],
        paragrafos: [
          'Requer scope CONTATOS_GERENCIAR na API Key.',
          'Chame antes do primeiro envio WhatsApp para um número, quando exigirConsentimento estiver ativo nas configurações.',
        ],
      },
      {
        titulo: 'Request / Response',
        exemplos: [
          {
            label: 'Request JSON',
            language: 'json',
            code: `{
  "canal": "WHATSAPP",
  "destinatario": "5571999999999",
  "nmContato": "Maria Silva"
}`,
          },
          {
            label: 'Response JSON',
            language: 'json',
            code: `{
  "idContato": 10,
  "canal": "WHATSAPP",
  "destinatario": "5571999999999",
  "nmContato": "Maria Silva",
  "status": "AUTORIZADO",
  "bloqueado": false
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'consultar-fila',
    titulo: 'Consultar fila',
    resumo: 'Acompanhar notificações enfileiradas e processadas.',
    secoes: [
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'GET /app/notificacoes/fila?page=0&size=10&status=PENDENTE',
          },
        ],
        paragrafos: [
          'Requer scope NOTIFICACOES_CONSULTAR ou autenticação JWT de usuário.',
          'Filtros opcionais: status (PENDENTE, ENVIADA, FALHOU…), canal, destinatario.',
        ],
      },
      {
        titulo: 'Response',
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "mensagem": "Operacao realizada com sucesso",
  "dados": [
    {
      "idNotificacao": 42,
      "canal": "WHATSAPP",
      "destinatario": "5571999999999",
      "status": "PENDENTE",
      "tentativas": 0,
      "dtCriacao": "2026-07-04T13:00:00"
    }
  ]
}`,
          },
        ],
        dica: 'Headers de paginação: X-Total-Count, X-Page, X-Page-Size, X-Total-Pages.',
      },
    ],
  },
  {
    id: 'status-integracao',
    titulo: 'Status da integração',
    resumo: 'Verificar se a API Key e o WhatsApp estão operacionais.',
    secoes: [
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'GET /app/integracao/status',
          },
        ],
      },
      {
        titulo: 'Response',
        exemplos: [
          {
            label: 'JSON — integração OK',
            language: 'json',
            code: `{
  "conectada": true,
  "idOrganizacao": 1,
  "autenticacao": "API_KEY",
  "whatsappConectado": true,
  "whatsappStatus": "CONECTADO",
  "whatsappTelefone": "5571999999999"
}`,
          },
        ],
        paragrafos: [
          'Use este endpoint em health checks do sistema externo antes de tentar enviar mensagens.',
          'Se whatsappConectado for false, conecte a sessão em WhatsApp no painel.',
        ],
      },
    ],
  },
  {
    id: 'outros-canais',
    titulo: 'Telegram e Webhook',
    resumo: 'Canais adicionais com o mesmo padrão de envio.',
    secoes: [
      {
        titulo: 'Telegram',
        paragrafos: [
          'Canal TELEGRAM no POST /app/notificacoes/enviar quando habilitado globalmente.',
          'destinatario é o identificador do chat/usuário no Telegram conforme configurado no provedor.',
        ],
        exemplos: [
          {
            label: 'Request JSON',
            language: 'json',
            code: `{
  "canal": "TELEGRAM",
  "destinatario": "123456789",
  "assunto": "Alerta",
  "mensagem": "Novo evento registrado no sistema."
}`,
          },
        ],
      },
      {
        titulo: 'Webhook',
        paragrafos: [
          'Canal WEBHOOK encaminha o payload para URLs configuradas em Configurações → Webhooks.',
          'Útil para integrar com Zapier, n8n ou APIs internas sem canal de mensageria direto.',
        ],
        exemplos: [
          {
            label: 'Request JSON',
            language: 'json',
            code: `{
  "canal": "WEBHOOK",
  "destinatario": "evento-pedido-criado",
  "assunto": "Pedido #1001",
  "mensagem": "{\\"pedidoId\\":1001,\\"valor\\":250.00}"
}`,
          },
        ],
      },
    ],
  },
  {
    id: 'exemplo-java',
    titulo: 'Exemplo em Java',
    resumo: 'Cliente HTTP com RestClient (Spring).',
    secoes: [
      {
        titulo: 'Envio com API Key',
        exemplos: [
          {
            label: 'Java',
            language: 'java',
            code: `RestClient client = RestClient.builder()
    .baseUrl("http://localhost:8086/api")
    .build();

Map<String, Object> body = Map.of(
    "canal", "WHATSAPP",
    "destinatario", "5571999999999",
    "assunto", "Novo pedido",
    "mensagem", "Seu pedido foi confirmado."
);

var resposta = client.post()
    .uri("/app/notificacoes/enviar")
    .header("X-API-KEY", System.getenv("NOTIFICACAO_API_KEY"))
    .contentType(MediaType.APPLICATION_JSON)
    .body(body)
    .retrieve()
    .body(EnviarNotificacaoResposta.class);`,
          },
        ],
      },
    ],
  },
  {
    id: 'erros-comuns',
    titulo: 'Erros comuns',
    resumo: 'Códigos HTTP e como resolver.',
    secoes: [
      {
        titulo: 'Tabela de referência',
        lista: [
          '401 — API Key ausente, inválida, expirada ou usando só o prefixo nak_xxx',
          '403 — API Key sem o scope necessário (ex.: NOTIFICACOES_ENVIAR)',
          '400 — Payload inválido, campo obrigatório ausente ou destinatário mal formatado',
          '404 — Template não encontrado (envio com templateKey inexistente)',
          '429 — Limite de envio excedido (políticas da organização ou do plano)',
          '503 — Serviço temporariamente indisponível; a equipe pode receber alerta por e-mail',
        ],
      },
      {
        titulo: 'Corpo de erro HTTP',
        exemplos: [
          {
            label: 'JSON — exemplo 403',
            language: 'json',
            code: `{
  "status": 403,
  "mensagem": "Acesso negado",
  "erro": "Forbidden"
}`,
          },
        ],
        dica: 'Em integrações de produção, trate sucesso: false no body mesmo com HTTP 200 — a API pode recusar o envio por regra de negócio sem erro HTTP.',
      },
    ],
  },
];
