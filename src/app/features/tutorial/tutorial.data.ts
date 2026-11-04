export type TutorialCodeLanguage =
  | 'http'
  | 'json'
  | 'bash'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'php'
  | 'csharp';

export interface TutorialCodeExample {
  label: string;
  language: TutorialCodeLanguage;
  code: string;
}

export interface TutorialSection {
  titulo: string;
  paragrafos?: string[];
  lista?: string[];
  exemplos?: TutorialCodeExample[];
  /** Quando 'abas', cada exemplo vira uma aba (ex.: linguagens). */
  modoExemplos?: 'lista' | 'abas';
  dica?: string;
}

export interface TutorialTopico {
  id: string;
  titulo: string;
  resumo: string;
  secoes: TutorialSection[];
}

const WHATSAPP_REQUEST_JSON = `{
  "canal": "WHATSAPP",
  "destinatario": "5571994686855",
  "assunto": "Pedido confirmado",
  "mensagem": "Olá! Seu pedido foi confirmado e será enviado em breve."
}`;

const WHATSAPP_RESPONSE_JSON = `{
  "sucesso": true,
  "idNotificacao": 42,
  "canal": "WHATSAPP",
  "status": "PENDENTE",
  "erro": null,
  "codigoErro": null,
  "motivoAguardando": null,
  "tentativas": 0,
  "tentativasMaximas": 3,
  "tempoEstimadoEnvioSegundos": 45,
  "posicaoFila": 2,
  "tempoEstimadoEnvioTexto": "cerca de 45 segundos"
}`;

export const TUTORIAL_TOPICOS: TutorialTopico[] = [
  {
    id: 'visao-geral',
    titulo: 'Visão geral',
    resumo: 'Integração M2M para envio de mensagens WhatsApp pela API.',
    secoes: [
      {
        titulo: 'O que é a integração',
        paragrafos: [
          'A Notificação API permite que sistemas externos (ERP, CRM, e-commerce, scripts) enviem mensagens WhatsApp sem login de usuário no painel.',
          'Fluxo típico: criar uma API Key na organização → configurar a chave no sistema externo → chamar os endpoints com o header X-API-KEY.',
          'As mensagens entram na fila da organização e são entregues pela sessão WhatsApp conectada no painel.',
        ],
      },
      {
        titulo: 'Base URL e prefixo',
        paragrafos: [
          'Todos os exemplos usam a URL base do ambiente. Em desenvolvimento: http://localhost:8086/api.',
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
        titulo: 'Pré-requisitos',
        lista: [
          'API Key ativa com scope NOTIFICACOES_ENVIAR',
          'Sessão WhatsApp da organização conectada (painel → WhatsApp)',
          'Destinatário em E.164 sem + (ex.: 5571994686855 — DDI 55 + DDD + celular com 9º dígito)',
          'Consentimento do contato registrado, quando a organização exige opt-in',
          'Bots externos: ver tópico Webhooks externos — entrada (genérico) e saída (POST no seu bot)',
        ],
      },
      {
        titulo: 'Health check (opcional)',
        paragrafos: [
          'Antes de enviar em produção, consulte o status da integração e da sessão WhatsApp.',
        ],
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'GET /app/integracao/status',
          },
          {
            label: 'Response JSON',
            language: 'json',
            code: `{
  "conectada": true,
  "idOrganizacao": 1,
  "autenticacao": "API_KEY",
  "whatsappConectado": true,
  "whatsappStatus": "CONECTADO",
  "whatsappTelefone": "5571981180200"
}`,
          },
        ],
        dica: 'Se whatsappConectado for false, conecte a sessão no painel antes de chamar o envio.',
      },
    ],
  },
  {
    id: 'autenticacao',
    titulo: 'Autenticação',
    resumo: 'API Key para integração entre sistemas (M2M).',
    secoes: [
      {
        titulo: 'Criar a API Key',
        paragrafos: [
          'No painel: Configurações → API Keys (perfil ADMIN da organização).',
          'Ao criar, copie o campo chave — ele é exibido apenas uma vez.',
          'Use sempre a chave completa no formato nak_prefixo.segredo, nunca só o prefixo.',
        ],
        lista: [
          'NOTIFICACOES_ENVIAR — envio unitário (uma mensagem por requisição)',
          'NOTIFICACOES_ENVIAR_LOTE — envio em lote (scope separado, menor risco de abuso acidental)',
          'NOTIFICACOES_CONSULTAR — consultar fila e historico (opcional)',
          'TEMPLATES_CONSULTAR — listar templates aprovados (opcional)',
        ],
      },
      {
        titulo: 'Header obrigatório',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'X-API-KEY: nak_wLku5PjG.sua_chave_completa_aqui',
          },
          {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST "{API_URL}/app/notificacoes/enviar" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: nak_prefixo.segredo" \\
  -d '${WHATSAPP_REQUEST_JSON.replace(/\n/g, '').replace(/  +/g, ' ')}'`,
          },
        ],
        dica: 'JWT (Authorization: Bearer) é usado pelo painel web. Para integração entre APIs, use sempre API Key.',
      },
      {
        titulo: 'Erros de autenticação',
        lista: [
          '401 — API Key ausente, inválida, expirada ou usando só o prefixo',
          '403 — API Key sem o scope necessário (ex.: NOTIFICACOES_ENVIAR ou NOTIFICACOES_ENVIAR_LOTE)',
        ],
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
      },
    ],
  },
  {
    id: 'envio-whatsapp',
    titulo: 'Enviar WhatsApp',
    resumo: 'Endpoint, payload, resposta e exemplos em várias linguagens.',
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
          'destinatario: telefone em E.164, apenas dígitos (ex.: 5571994686855).',
          'Celulares brasileiros devem incluir o 9º dígito após o DDD.',
          'assunto: título interno / referência (não é exibido como push no WhatsApp).',
          'mensagem: texto enviado ao contato.',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: WHATSAPP_REQUEST_JSON,
          },
        ],
      },
      {
        titulo: 'Response',
        paragrafos: [
          'sucesso: true indica que a mensagem foi aceita e enfileirada.',
          'status PENDENTE ou PROCESSANDO: aguardando a fila; ENVIADA: entregue ao gateway.',
          'Mesmo com HTTP 200, verifique sucesso no body — regras de negócio podem bloquear o envio.',
        ],
        exemplos: [
          {
            label: 'JSON — sucesso (200)',
            language: 'json',
            code: WHATSAPP_RESPONSE_JSON,
          },
          {
            label: 'JSON — bloqueio por consentimento',
            language: 'json',
            code: `{
  "sucesso": false,
  "idNotificacao": null,
  "canal": "WHATSAPP",
  "status": "BLOQUEADA",
  "erro": "Contato sem consentimento para WhatsApp",
  "codigoErro": null,
  "motivoAguardando": null,
  "tentativas": null,
  "tentativasMaximas": null,
  "tempoEstimadoEnvioSegundos": null,
  "posicaoFila": null,
  "tempoEstimadoEnvioTexto": null
}`,
          },
        ],
      },
      {
        titulo: 'Exemplos por linguagem',
        modoExemplos: 'abas',
        paragrafos: [
          'Substitua {API_URL} pela base do ambiente e configure a variável da API Key no seu sistema.',
        ],
        exemplos: [
          {
            label: 'TypeScript (fetch)',
            language: 'typescript',
            code: `const apiUrl = '{API_URL}';
const apiKey = process.env.NOTIFICACAO_API_KEY!;

const response = await fetch(\`\${apiUrl}/app/notificacoes/enviar\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
  },
  body: JSON.stringify({
    canal: 'WHATSAPP',
    destinatario: '5571994686855',
    assunto: 'Pedido confirmado',
    mensagem: 'Olá! Seu pedido foi confirmado.',
  }),
});

const data = await response.json();
console.log(data);`,
          },
          {
            label: 'Java (Spring RestClient)',
            language: 'java',
            code: `RestClient client = RestClient.builder()
    .baseUrl("{API_URL}")
    .defaultHeader("X-API-KEY", System.getenv("NOTIFICACAO_API_KEY"))
    .build();

Map<String, Object> body = Map.of(
    "canal", "WHATSAPP",
    "destinatario", "5571994686855",
    "assunto", "Pedido confirmado",
    "mensagem", "Olá! Seu pedido foi confirmado."
);

var resposta = client.post()
    .uri("/app/notificacoes/enviar")
    .contentType(MediaType.APPLICATION_JSON)
    .body(body)
    .retrieve()
    .body(EnviarNotificacaoResposta.class);`,
          },
          {
            label: 'PHP (cURL)',
            language: 'php',
            code: `<?php
$apiUrl = '{API_URL}';
$apiKey = getenv('NOTIFICACAO_API_KEY');

$payload = [
    'canal' => 'WHATSAPP',
    'destinatario' => '5571994686855',
    'assunto' => 'Pedido confirmado',
    'mensagem' => 'Olá! Seu pedido foi confirmado.',
];

$ch = curl_init("$apiUrl/app/notificacoes/enviar");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-KEY: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);`,
          },
          {
            label: 'C# (HttpClient)',
            language: 'csharp',
            code: `using System.Net.Http.Json;

var apiUrl = "{API_URL}";
var apiKey = Environment.GetEnvironmentVariable("NOTIFICACAO_API_KEY");

using var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-API-KEY", apiKey);

var payload = new
{
    canal = "WHATSAPP",
    destinatario = "5571994686855",
    assunto = "Pedido confirmado",
    mensagem = "Olá! Seu pedido foi confirmado."
};

var response = await client.PostAsJsonAsync(
    $"{apiUrl}/app/notificacoes/enviar",
    payload);

var data = await response.Content.ReadFromJsonAsync<JsonElement>();`,
          },
        ],
      },
      {
        titulo: 'Erros comuns no envio',
        lista: [
          '400 — payload inválido ou destinatário mal formatado',
          '429 — limite de envio da organização ou do plano',
          'WhatsApp não conectado — conecte a sessão no painel',
          'Restrição 463 / sem histórico — contato pode precisar enviar a primeira mensagem',
        ],
        dica: 'Consulte o idNotificacao retornado e acompanhe o status na fila do painel ou via GET /app/notificacoes/fila (scope NOTIFICACOES_CONSULTAR).',
      },
    ],
  },
  {
    id: 'envio-lote',
    titulo: 'Envio em lote',
    resumo: 'Várias mensagens WhatsApp em uma requisição, com scope dedicado e validações de segurança.',
    secoes: [
      {
        titulo: 'Por que um endpoint separado',
        paragrafos: [
          'O envio em lote usa rota e scope próprios para reduzir risco: uma API Key com NOTIFICACOES_ENVIAR não consegue disparar lotes acidentalmente.',
          'É necessário NOTIFICACOES_ENVIAR_LOTE (ou perfil ADMIN no painel). O envio unitário continua em POST /app/notificacoes/enviar.',
        ],
      },
      {
        titulo: 'Endpoint',
        exemplos: [
          {
            label: 'HTTP',
            language: 'http',
            code: 'POST /app/notificacoes/enviar-lote',
          },
        ],
      },
      {
        titulo: 'Request body',
        paragrafos: [
          'canal: apenas WHATSAPP.',
          'mensagens: lista com até 50 itens (limite operacional configurável no servidor).',
          'referenciaExterna (opcional): identificador do seu sistema para correlacionar cada item na resposta.',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "canal": "WHATSAPP",
  "mensagens": [
    {
      "destinatario": "5571994686855",
      "assunto": "Pedido 1001",
      "mensagem": "Olá! Seu pedido 1001 foi confirmado.",
      "referenciaExterna": "pedido-1001"
    },
    {
      "destinatario": "5571981180200",
      "assunto": "Pedido 1002",
      "mensagem": "Olá! Seu pedido 1002 foi confirmado.",
      "referenciaExterna": "pedido-1002"
    }
  ]
}`,
          },
        ],
      },
      {
        titulo: 'Response',
        paragrafos: [
          'HTTP 200 quando a estrutura do lote é válida — mesmo com falhas parciais por item.',
          'sucesso: true apenas se todos os itens foram aceitos.',
          'aceitas / rejeitadas: totais agregados; detalhe por item em itens[].resultado.',
        ],
        exemplos: [
          {
            label: 'JSON — sucesso parcial',
            language: 'json',
            code: `{
  "sucesso": false,
  "total": 2,
  "aceitas": 1,
  "rejeitadas": 1,
  "itens": [
    {
      "indice": 0,
      "referenciaExterna": "pedido-1001",
      "destinatario": "5571994686855",
      "resultado": {
        "sucesso": true,
        "idNotificacao": 42,
        "canal": "WHATSAPP",
        "status": "PENDENTE"
      }
    },
    {
      "indice": 1,
      "referenciaExterna": "pedido-1002",
      "destinatario": "5571981180200",
      "resultado": {
        "sucesso": false,
        "erro": "Contato sem consentimento para WhatsApp"
      }
    }
  ]
}`,
          },
        ],
      },
      {
        titulo: 'Regras de segurança',
        lista: [
          'Scope NOTIFICACOES_ENVIAR_LOTE obrigatório (403 sem ele)',
          'Limite de tamanho do lote (padrão: 50 mensagens)',
          'Sem duplicatas no mesmo lote (mesmo destinatário + mesma mensagem)',
          'referenciaExterna única dentro do lote, quando informada',
          'Validação de limite mensal do plano antes de processar o lote',
          'Sessão WhatsApp deve estar conectada antes do processamento',
          'Cada item enfileirado em transação isolada (falha de um não desfaz os demais)',
        ],
        dica: 'Para campanhas grandes, divida em vários lotes respeitando o limite e monitore aceitas/rejeitadas em cada resposta.',
      },
      {
        titulo: 'Exemplo cURL',
        exemplos: [
          {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST "{API_URL}/app/notificacoes/enviar-lote" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: nak_prefixo.segredo" \\
  -d '{"canal":"WHATSAPP","mensagens":[{"destinatario":"5571994686855","mensagem":"Olá!"}]}'`,
          },
        ],
      },
    ],
  },
  {
    id: 'webhooks-externos',
    titulo: 'Webhooks externos',
    resumo:
      'Entrada: bot envia para a plataforma (genérico/GitHub). Saída: plataforma POST no seu bot (WhatsApp recebido, fila).',
    secoes: [
      {
        titulo: 'Duas direções',
        paragrafos: [
          'Integração com bot ou automação (n8n, Make, serviço próprio) usa URLs diferentes — não confunda os papéis.',
          'Entrada (bot → plataforma): seu sistema faz POST em /webhooks/generico ou /webhooks/github para enfileirar WhatsApp.',
          'Saída (plataforma → bot): a API faz POST na URL que você cadastrou quando ocorre um evento (mensagem WhatsApp recebida, notificação na fila, etc.).',
        ],
        lista: [
          'Bot pede “URL do webhook da plataforma” → webhook genérico ou GitHub (seções abaixo).',
          'Bot gera URL para receber eventos → cadastre em Configurações → Webhooks de saída (recomendado) ou WhatsApp → webhook inbound (URL única).',
        ],
      },
      {
        titulo: 'Webhook de saída — visão geral',
        paragrafos: [
          'Use quando o bot precisa reagir a mensagens WhatsApp inbound ou a mudanças na fila sem polling.',
          'Requisito: feature WEBHOOK habilitada na organização (super admin → Feature Flags).',
          'Cadastro: painel → Configurações → Webhooks de saída → informe URL do seu bot, secret, Authorization (se o bot exigir) e marque os eventos.',
          'A plataforma envia POST assíncrono; falhas de entrega são registradas no log de entregas (sem retry automático hoje). Responda HTTP 2xx rapidamente no bot.',
        ],
        lista: [
          'Header X-Webhook-Event — nome do evento (ex.: WHATSAPP_MENSAGEM_RECEBIDA)',
          'Header X-Webhook-Secret — mesmo secret definido ao salvar o webhook no painel',
          'Header Authorization (opcional) — valor completo cadastrado no painel (ex.: Bearer seu-token); enviado em todo POST de saída',
          'Body JSON — envelope: evento, ocorridoEm, idOrganizacao, dados',
          'Metadados (painel/API Key): GET /app/integracao/webhook/saida',
        ],
      },
      {
        titulo: 'Header de autorização (opcional)',
        paragrafos: [
          'Use quando o destino (ex.: agente de IA) responde HTTP 401 sem Bearer token.',
          'No painel: Configurações → Webhooks → cadastro de saída → campo Header de autorização. Informe o valor completo (ex.: Bearer chave), não só o token. Armazenamento criptografado; na tela o valor fica mascarado e a API nunca devolve o texto.',
          'Na edição, deixe o campo vazio para manter o valor salvo.',
        ],
        exemplos: [
          {
            label: 'Como a plataforma monta o POST (Node — referência)',
            language: 'javascript',
            code: `const headers = {
  'Content-Type': 'application/json',
  'X-Webhook-Event': evento,
  'X-Webhook-Secret': secretDescriptografado,
};
if (authorizationHeader) {
  headers['Authorization'] = authorizationHeader; // ex.: "Bearer chave"
}
await fetch(url, { method: 'POST', headers, body: JSON.stringify(envelope) });`,
          },
          {
            label: 'Implementação na API (Java / Spring RestClient)',
            language: 'java',
            code: `var spec = restClient.post()
    .uri(webhook.getUrl())
    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
    .header("X-Webhook-Event", evento.name())
    .header("X-Webhook-Secret", secret);
if (StringUtils.hasText(authorization)) {
  spec = spec.header(HttpHeaders.AUTHORIZATION, authorization);
}
spec.body(envelope).retrieve().toBodilessEntity();`,
          },
        ],
      },
      {
        titulo: 'Webhook de saída — eventos disparados hoje',
        lista: [
          'WHATSAPP_MENSAGEM_RECEBIDA — contato mandou mensagem na sessão WhatsApp conectada',
          'NOTIFICACAO_CRIADA — notificação aceita e enfileirada (POST /app/notificacoes/enviar, webhook genérico, etc.)',
          'NOTIFICACAO_ENVIADA — mensagem entregue ao gateway/provedor WhatsApp',
          'NOTIFICACAO_FALHOU — falha definitiva na fila (tentativas esgotadas ou erro não reenviável)',
        ],
        paragrafos: [
          'Cadastrados na UI mas ainda sem POST automático: NOTIFICACAO_ENTREGUE, NOTIFICACAO_LIDA, WHATSAPP_DESCONECTADO, WHATSAPP_QR_ATUALIZADO, CONTATO_BLOQUEADO.',
          'Webhooks criados antes de mar/2026: edite e salve de novo informando o secret (obrigatório para disparo).',
        ],
      },
      {
        titulo: 'Log de entregas (diagnóstico)',
        paragrafos: [
          'Cada tentativa de POST para o bot (webhooks de saída cadastrados e encaminhamento WhatsApp URL única) fica registrada por organização.',
          'Painel: Configurações → Webhooks → Log de entregas (admin). API: GET /app/configuracoes/webhooks/entregas com paginação Spring (page, size, sort=dtCriacao,desc).',
        ],
        lista: [
          'Canal OUTBOUND — POST com envelope e headers X-Webhook-* para um cadastro de saída',
          'Canal INBOUND_WHATSAPP — POST na URL única de encaminhamento WhatsApp',
          'Colunas úteis: httpStatus, sucesso, erro, resumo (corpo truncado)',
        ],
      },
      {
        titulo: 'Webhook de saída — exemplos de payload',
        exemplos: [
          {
            label: 'WHATSAPP_MENSAGEM_RECEBIDA',
            language: 'json',
            code: `{
  "evento": "WHATSAPP_MENSAGEM_RECEBIDA",
  "ocorridoEm": "2026-11-04T15:30:00",
  "idOrganizacao": 1,
  "dados": {
    "idOrganizacao": 1,
    "telefone": "5571999999999",
    "preview": "Olá, preciso de ajuda",
    "idMensagemExterna": "msg-gateway-abc",
    "tipo": "texto",
    "nmContato": "Cliente",
    "recebidaEm": "2026-11-04T15:30:00"
  }
}`,
          },
          {
            label: 'NOTIFICACAO_CRIADA / ENVIADA / FALHOU (dados)',
            language: 'json',
            code: `{
  "evento": "NOTIFICACAO_ENVIADA",
  "ocorridoEm": "2026-11-04T15:31:00",
  "idOrganizacao": 1,
  "dados": {
    "idNotificacao": 42,
    "canal": "WHATSAPP",
    "status": "ENVIADA",
    "destinatario": "5571999999999",
    "assunto": "Pedido confirmado",
    "erro": null
  }
}`,
          },
          {
            label: 'HTTP recebido pelo seu servidor',
            language: 'http',
            code: `POST https://seu-bot.exemplo.com/api/webhooks/notificacao
Content-Type: application/json
X-Webhook-Event: WHATSAPP_MENSAGEM_RECEBIDA
X-Webhook-Secret: seu-secret-configurado-no-painel
Authorization: Bearer seu-token-opcional`,
          },
        ],
      },
      {
        titulo: 'Webhook de saída — handler de exemplo',
        modoExemplos: 'lista',
        exemplos: [
          {
            label: 'Node (Express)',
            language: 'javascript',
            code: `app.post('/api/webhooks/notificacao', (req, res) => {
  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }
  const evento = req.headers['x-webhook-event'];
  const { dados } = req.body ?? {};
  if (evento === 'WHATSAPP_MENSAGEM_RECEBIDA') {
    console.log('WhatsApp de', dados.telefone, ':', dados.preview);
  }
  res.sendStatus(204);
});`,
          },
        ],
        dica: 'Vários webhooks de saída podem coexistir (URLs diferentes ou mesma URL com eventos distintos). Para uma única URL fixa sem envelope, use Configurações → WhatsApp → webhook inbound (payload plano em dados).',
      },
      {
        titulo: 'Webhook genérico (bot → plataforma)',
        paragrafos: [
          'Qualquer sistema com API Key pode POST JSON (ou text/plain) para entrar na fila de notificações WhatsApp.',
          'Feature WEBHOOK_GENERICO deve estar habilitada na organização (super admin → Feature Flags).',
          'No painel autenticado: Configurações → WhatsApp → Webhook para bot externo — botão Copiar URL do webhook (mesmo padrão do GitHub).',
          'Metadados e exemplo de corpo: GET /app/integracao/webhook/generico (JWT ou X-API-KEY).',
        ],
        exemplos: [
          {
            label: 'URL do webhook (substitua a API Key)',
            language: 'bash',
            code: '{API_URL}/webhooks/generico?key=nak_prefixo.segredo_completo',
          },
          {
            label: 'HTTP — alternativa com header',
            language: 'http',
            code: `POST /webhooks/generico
Host: (seu host da API)
Content-Type: application/json
X-API-KEY: nak_prefixo.segredo_completo`,
          },
        ],
        dica: 'A rota /webhooks/* não usa JWT: autenticação só por API Key (query key= ou header X-API-KEY). Scope obrigatório: NOTIFICACOES_ENVIAR.',
      },
      {
        titulo: 'Autenticação e headers (genérico)',
        lista: [
          'X-API-KEY ou query key= — API Key completa (nak_prefixo.segredo)',
          'Content-Type: application/json ou text/plain',
          'X-Webhook-Signature-256 (opcional): sha256=<hmac-sha256 do body>, secret = mesma API Key',
          'X-Webhook-Delivery (opcional): id de entrega; vira referência se o body não tiver referenciaExterna',
        ],
      },
      {
        titulo: 'Corpo JSON (genérico)',
        paragrafos: [
          'Aliases aceitos: titulo (assunto), message / text (mensagem).',
          'Sem destinatario: com webhookRegistrarFilaSemDestinatario true (padrão), registra item bloqueado na fila; com false, retorna sucesso false sem criar item.',
        ],
        exemplos: [
          {
            label: 'JSON',
            language: 'json',
            code: `{
  "destinatario": "5571999999999",
  "assunto": "Alerta sistema X",
  "mensagem": "Texto da notificacao",
  "referenciaExterna": "pedido-123"
}`,
          },
          {
            label: 'Response (200)',
            language: 'json',
            code: `{
  "sucesso": true,
  "idNotificacao": 42,
  "canal": "WHATSAPP",
  "status": "PENDENTE"
}`,
          },
          {
            label: 'cURL',
            language: 'bash',
            code: `curl -X POST "{API_URL}/webhooks/generico?key=nak_prefixo.segredo" \\
  -H "Content-Type: application/json" \\
  -d '{"destinatario":"5571999999999","mensagem":"Olá pelo webhook"}'`,
          },
        ],
      },
      {
        titulo: 'Webhook inbound WhatsApp (plataforma → bot, URL única)',
        paragrafos: [
          'Após registrar a mensagem na conversa, a API encaminha um POST assíncrono para a URL configurada na organização.',
          'Feature WEBHOOK no plano; configurar em Configurações → WhatsApp → Integração externa (webhook inbound): URL, secret e habilitar encaminhamento.',
          'Em produção a URL cadastrada deve ser HTTPS. Falhas de entrega são apenas logadas (sem fila de retry automática).',
        ],
        lista: [
          'Header X-Webhook-Secret: mesmo secret configurado no painel',
          'Content-Type: application/json',
          'Responda 2xx rapidamente; processamento pesado deve ser assíncrono no seu bot',
        ],
        exemplos: [
          {
            label: 'Payload recebido pelo bot',
            language: 'json',
            code: `{
  "idOrganizacao": 1,
  "telefone": "5571999999999",
  "preview": "Texto ou trecho da mensagem",
  "idMensagemExterna": "id-no-gateway",
  "tipo": "texto",
  "nmContato": "Nome no WhatsApp",
  "recebidaEm": "2026-11-04T15:30:00"
}`,
          },
          {
            label: 'Exemplo handler (Node)',
            language: 'javascript',
            code: `app.post('/webhooks/whatsapp/inbound', (req, res) => {
  if (req.headers['x-webhook-secret'] !== process.env.WEBHOOK_SECRET) {
    return res.sendStatus(401);
  }
  const { telefone, preview, tipo } = req.body;
  // enfileirar processamento…
  res.sendStatus(204);
});`,
          },
        ],
        dica: 'Configuração também via PUT /app/configuracoes (admin) ou GET/PUT /app/integracao/whatsapp/webhook-inbound com GLOBAL_API_KEY.',
      },
      {
        titulo: 'Webhook GitHub (GitHub → plataforma)',
        paragrafos: [
          'Eventos do GitHub App entram pela URL abaixo; secret do webhook no GitHub = mesma API Key completa.',
          'Detalhes de template, colunas e opt-in: tópico Bot GitHub + WhatsApp e GET /app/integracao/github/webhook.',
        ],
        exemplos: [
          {
            label: 'URL no GitHub App',
            language: 'bash',
            code: '{API_URL}/webhooks/github?key=nak_prefixo.segredo_completo',
          },
          {
            label: 'Headers esperados (GitHub)',
            language: 'http',
            code: `X-GitHub-Event: projects_v2_item
X-GitHub-Delivery: uuid
X-Hub-Signature-256: sha256=...`,
          },
        ],
      },
      {
        titulo: 'Webhook kanban → bot (movimentação Project v2)',
        paragrafos: [
          'Opcional: além do WhatsApp direto, a API pode POST na URL do seu bot quando um card muda de coluna (Status).',
          'Configure kanbanMovimentacaoWebhookUrl e Authorization em PATCH /app/integracao/github/kanban-movimentacao-webhook.',
          'Modo LOTE: um POST agregado a cada N minutos; IMEDIATO: um POST por movimentação. Ver tópico Bot GitHub + WhatsApp.',
        ],
        exemplos: [
          {
            label: 'HTTP (configuração)',
            language: 'http',
            code: `GET /app/integracao/github/kanban-movimentacao-webhook
PATCH /app/integracao/github/kanban-movimentacao-webhook
POST /app/integracao/github/kanban-movimentacao-webhook/teste`,
          },
        ],
      },
      {
        titulo: 'Rotas internas (não use no bot)',
        lista: [
          '/webhooks/whatsapp/gateway — gateway Baileys → API',
          '/webhooks/whatsapp/meta — Meta Cloud → API',
        ],
        dica: 'Use Webhooks de saída (Configurações → Webhooks) para vários destinos e filtros por evento; use webhook inbound na aba WhatsApp se preferir uma única URL com payload plano (sem envelope evento/ocorridoEm).',
      },
    ],
  },
  {
    id: 'bot-github-whatsapp',
    titulo: 'Bot GitHub + WhatsApp',
    resumo:
      'Orquestrador com API Key: ler Project v2, mapear devs com opt-in e enviar mensagens (fila ou gateway).',
    secoes: [
      {
        titulo: 'Papel do bot',
        paragrafos: [
          'Use um bot quando a lógica não cabe só no webhook nativo do GitHub (relatórios periódicos, regras customizadas, cruzamento com outros sistemas).',
          'O bot autentica com X-API-KEY da organização. Ele não substitui o GitHub App: credenciais (App/PAT) e project vinculado ficam configurados no painel (Integrações → GitHub).',
          'O WhatsApp de origem é sempre a sessão conectada na organização — o bot apenas enfileira ou dispara mensagens por essa sessão.',
        ],
        lista: [
          'Webhook automático (GitHub → API → WhatsApp): eventos em tempo real com regras por coluna no painel — ver GET /app/integracao/github/webhook e tópico Webhooks externos.',
          'Bot: consulta estado, decide destinatários e chama envio — este guia.',
        ],
      },
      {
        titulo: 'Pré-requisitos na organização',
        lista: [
          'Feature GITHUB_WEBHOOK habilitada (super admin)',
          'Sessão WhatsApp conectada (GET /app/integracao/status → whatsappConectado: true)',
          'GitHub App instalado na org ou PAT com leitura de Projects (configurado no painel)',
          'Project v2 vinculado (dsGithubProjectV2NodeId) — via painel ou primeiro webhook',
          'API Key com NOTIFICACOES_ENVIAR; opcional NOTIFICACOES_CONSULTAR para acompanhar a fila',
          'Devs com opt-in WhatsApp (frase de ativação + login GitHub) — ver seção Destinatários',
        ],
      },
      {
        titulo: 'Autenticação do bot (API Key + scope)',
        paragrafos: [
          'Header em todas as chamadas: X-API-KEY: nak_prefixo.segredo (chave completa).',
          'O bot usa API Key normal da organização com scope NOTIFICACOES_ENVIAR (o mesmo do webhook GitHub e do POST /app/notificacoes/enviar).',
          'Rotas de leitura em /app/integracao/github/** exigem esse scope; alteração de configuração (PATCH) continua só para ADMIN no painel.',
          'Base: {API_URL}/app/...',
        ],
        lista: [
          'GET /app/integracao/status — saúde geral + WhatsApp',
          'GET /app/integracao/whatsapp/status — status da sessão',
          'GET /app/integracao/webhook/generico — webhook JSON genérico (opcional)',
          'POST /app/notificacoes/enviar — envio via fila (recomendado para o bot)',
          'POST /app/integracao/whatsapp/enviar-mensagem — envio direto ao gateway (testes / baixo volume)',
          'GET /app/notificacoes/fila e GET /app/notificacoes/{id} — com scope NOTIFICACOES_CONSULTAR',
          'Tudo sob /app/integracao/github/** — hub, projects, GraphQL, responsáveis, decisões, preview (ver seção GitHub)',
        ],
      },
      {
        titulo: 'Leitura GitHub (scope NOTIFICACOES_ENVIAR)',
        paragrafos: [
          'A API usa o token GitHub já salvo na organização. O bot não envia PAT próprio no header.',
          'Não há endpoint para listar todos os cards do board de uma vez; use combinação de webhook (nodeId) + consulta por item, ou aguarde extensão da API.',
        ],
        lista: [
          'GET /app/integracao/github — hub e módulos habilitados',
          'GET /app/integracao/github/modulos/projects-v2 — regras, fluxo por coluna, templates',
          'GET /app/integracao/github/projects?orgLogin= — lista projects da org',
          'GET /app/integracao/github/project/vinculo — project vinculado + opções de Status + listas de disparo',
          'GET /app/integracao/github/project/status-opcoes?projectNodeId= — nomes das colunas (Status)',
          'POST /app/integracao/github/graphql/consulta — detalhes de um card/issue/PR por nodeId',
          'GET /app/integracao/github/webhook/decisoes?pagina=0&tamanho=20 — auditoria do webhook (debug)',
          'POST /app/integracao/github/webhook/template/preview — validar texto sem enviar WhatsApp',
        ],
        exemplos: [
          {
            label: 'GraphQL consulta — request',
            language: 'json',
            code: `{
  "nodeId": "I_kwDOEKnzAs7jK9xQ",
  "contentType": "Issue"
}`,
          },
          {
            label: 'GraphQL consulta — HTTP',
            language: 'http',
            code: `POST /app/integracao/github/graphql/consulta
X-API-KEY: nak_prefixo.segredo
Content-Type: application/json`,
          },
        ],
      },
      {
        titulo: 'Destinatários (login GitHub → WhatsApp)',
        paragrafos: [
          'Quem recebe alertas GitHub precisa ter feito opt-in: abrir linkWhatsappAtivacao (retornado em GET /app/integracao/github/webhook), enviar a frase configurada e informar o login GitHub.',
          'GET /app/integracao/github/responsaveis lista vínculos (githubLogin, habilitado, ativo). O telefone vem mascarado por privacidade — a API não devolve número completo para integradores.',
          'Para enviar com POST /app/notificacoes/enviar o campo destinatario deve ser telefone E.164 (só dígitos). O bot precisa resolver login → telefone por regra de negócio própria (ex.: base sincronizada no opt-in) ou usar apenas logins já mapeados no seu sistema.',
          'Respeite habilitado e ativo na lista de responsáveis antes de enviar. Opt-in é obrigatório no fluxo webhook nativo; envios pela fila podem ainda respeitar consentimento da organização.',
        ],
        exemplos: [
          {
            label: 'Responsável (campos principais)',
            language: 'json',
            code: `{
  "idGithubResponsavel": 12,
  "githubLogin": "octocat",
  "whatsappMascarado": "55719****6855",
  "habilitado": true,
  "ativo": true
}`,
          },
        ],
      },
      {
        titulo: 'Enviar mensagens (recomendado: fila)',
        paragrafos: [
          'Prefira POST /app/notificacoes/enviar: rate limit da org, histórico, retentativas e referenciaExterna para idempotência (ex.: bot-digest-2026-04-01-octocat-card-123).',
          'POST /app/integracao/whatsapp/enviar-mensagem envia direto (telefone + mensagem), útil para smoke test após conectar o WhatsApp.',
        ],
        exemplos: [
          {
            label: 'Enviar via fila — JSON',
            language: 'json',
            code: `{
  "canal": "WHATSAPP",
  "destinatario": "5571994686855",
  "assunto": "GitHub — Em revisão",
  "mensagem": "Olá! O card *API-42* entrou em Em revisão.\\nhttps://github.com/org/repo/issues/42",
  "referenciaExterna": "bot-coluna-revisao-I_kwDOxxx"
}`,
          },
          {
            label: 'Envio direto gateway — JSON',
            language: 'json',
            code: `{
  "telefone": "5571994686855",
  "mensagem": "Teste do bot GitHub"
}`,
          },
          {
            label: 'Envio direto — HTTP',
            language: 'http',
            code: `POST /app/integracao/whatsapp/enviar-mensagem
X-API-KEY: nak_prefixo.segredo
Content-Type: application/json`,
          },
        ],
      },
      {
        titulo: 'Fluxo sugerido para o bot (cron ou fila externa)',
        lista: [
          '1. GET /app/integracao/status — abortar se WhatsApp desconectado',
          '2. GET /app/integracao/github/webhook — feature ligada, variáveis de template se for montar texto igual ao painel',
          '3. GET /app/integracao/github/project/vinculo + POST graphql/consulta por cada nodeId que o bot rastreia',
          '4. GET /app/integracao/github/responsaveis — filtrar logins ativos',
          '5. Montar mensagem (ou POST template/preview com cenarioId, ex. projects_v2_edited)',
          '6. POST /app/notificacoes/enviar por destinatário, com referenciaExterna única',
          '7. Opcional: GET /app/notificacoes/fila?... para confirmar ENVIADA ou erro',
        ],
      },
      {
        titulo: 'Exemplo TypeScript (esqueleto)',
        modoExemplos: 'lista',
        exemplos: [
          {
            label: 'TypeScript',
            language: 'typescript',
            code: `const apiUrl = '{API_URL}';
const apiKey = process.env.NOTIFICACAO_API_KEY!;

async function apiGet(path: string) {
  const res = await fetch(\`\${apiUrl}\${path}\`, {
    headers: { 'X-API-KEY': apiKey },
  });
  if (!res.ok) throw new Error(\`\${path} → \${res.status}\`);
  return res.json();
}

async function runBot() {
  const status = await apiGet('/app/integracao/status');
  if (!status.whatsappConectado) {
    throw new Error('WhatsApp desconectado na organização');
  }

  const meta = await apiGet('/app/integracao/github/webhook');
  if (!meta.featureHabilitada) {
    throw new Error('GITHUB_WEBHOOK desabilitado para esta org');
  }

  const vinculo = await apiGet('/app/integracao/github/project/vinculo');
  const responsaveis = await apiGet('/app/integracao/github/responsaveis');

  const telefone = '5571994686855'; // resolvido pelo seu mapa login → telefone
  await fetch(\`\${apiUrl}/app/notificacoes/enviar\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      canal: 'WHATSAPP',
      destinatario: telefone,
      assunto: 'Bot GitHub',
      mensagem: 'Resumo do seu kanban…',
      referenciaExterna: 'bot-run-' + new Date().toISOString().slice(0, 10),
    }),
  });
}`,
          },
        ],
        dica:
          'Para eventos em tempo real sem polling, configure o GitHub App para POST /api/webhooks/github?key={API_KEY} e use o bot só para lógica complementar.',
      },
      {
        titulo: 'Webhook externo de movimentação (bot / automação)',
        paragrafos: [
          'Configure em Integrações → GitHub → Módulos → Project v2: destino Somente bot ou WhatsApp+bot.',
          'Modo LOTE (padrão): a API acumula mudanças de coluna e envia um POST JSON a cada N minutos (ex.: 30), só se houver itens novos — ideal para economizar tokens no seu bot.',
          'Modo IMEDIATO: um POST por movimentação. O payload inclui título, colunas de/para, logins e nomes (movido_por_detalhe, responsaveis_detalhe) para evitar consultar o GitHub a cada evento.',
          'No lote, o corpo traz tipo=lote, periodo_inicio/fim e movimentacoes[].',
        ],
        exemplos: [
          {
            label: 'Config PATCH (admin painel ou API)',
            language: 'json',
            code: `{
  "kanbanMovimentacaoWebhookHabilitado": true,
  "githubWhatsappDiretoHabilitado": false,
  "kanbanMovimentacaoWebhookModoEnvio": "LOTE",
  "kanbanMovimentacaoWebhookIntervaloMinutos": 30,
  "kanbanMovimentacaoWebhookUrl": "https://seu-bot/…",
  "kanbanMovimentacaoWebhookAuthorization": "Bearer …"
}`,
          },
          {
            label: 'HTTP',
            language: 'http',
            code: `GET /app/integracao/github/kanban-movimentacao-webhook
PATCH /app/integracao/github/kanban-movimentacao-webhook
POST /app/integracao/github/kanban-movimentacao-webhook/teste`,
          },
        ],
      },
      {
        titulo: 'Webhook GitHub (referência rápida)',
        paragrafos: [
          'URL: POST {API_URL}/webhooks/github?key={API_KEY_COMPLETA} (ou header X-API-KEY).',
          'Webhook secret no GitHub App = mesma API Key completa (scope NOTIFICACOES_ENVIAR).',
          'Headers esperados: X-GitHub-Event, X-GitHub-Delivery, X-Hub-Signature-256.',
        ],
        exemplos: [
          {
            label: 'Metadados no painel/bot',
            language: 'http',
            code: 'GET /app/integracao/github/webhook',
          },
        ],
      },
      {
        titulo: 'Erros e limites',
        lista: [
          '401 — API Key inválida ou ausente',
          '403 — API Key sem scope NOTIFICACOES_ENVIAR ou tentativa de PATCH/DELETE GitHub sem ROLE_ADMIN',
          '409 — token GitHub não configurado ou expirado (consultas GraphQL / projects)',
          '429 — limite de envio do plano',
          'BLOQUEADA na fila — consentimento WhatsApp ou contato inválido',
        ],
      },
    ],
  },
];

export const TUTORIAL_TOPICO_PADRAO_ID = TUTORIAL_TOPICOS[0]?.id ?? 'visao-geral';

export function tutorialTopicoValido(id: string | null | undefined): boolean {
  return id != null && TUTORIAL_TOPICOS.some((t) => t.id === id);
}
