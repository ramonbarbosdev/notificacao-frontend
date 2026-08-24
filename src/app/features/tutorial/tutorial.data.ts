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
];
