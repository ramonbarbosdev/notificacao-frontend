export type AbaConfiguracaoGlobal = 'plataforma' | 'email-alertas' | 'canais';

export interface LinkInstrucao {
  rotulo: string;
  url: string;
}

export interface PassoInstrucao {
  titulo: string;
  descricao: string;
  links?: LinkInstrucao[];
}

export interface InstrucoesAba {
  titulo: string;
  resumo: string;
  passos: PassoInstrucao[];
  dica?: string;
}

export const CAMPOS_POR_ABA: Record<AbaConfiguracaoGlobal, readonly string[]> = {
  plataforma: ['nmPlataforma', 'nmDominioPrincipal', 'nmEmailSuporte', 'nuTimezonePadrao'],
  'email-alertas': ['nmEmailAlertas', 'dsSmtpHost', 'nuSmtpPorta', 'nmSmtpUsuario', 'dsSmtpSenha'],
  canais: [
    'flWhatsappProviderPadrao',
    'flEmailHabilitado',
    'flTelegramHabilitado',
    'flWebhooksHabilitado',
    'flApiPublicaHabilitada',
    'flTemplatesHabilitado',
  ],
};

export const ROTULO_ABA: Record<AbaConfiguracaoGlobal, string> = {
  plataforma: 'Plataforma',
  'email-alertas': 'E-mail e alertas',
  canais: 'Canais e recursos',
};

export const ABAS_CONFIG_GLOBAL: { id: AbaConfiguracaoGlobal; label: string }[] = [
  { id: 'plataforma', label: ROTULO_ABA.plataforma },
  { id: 'email-alertas', label: ROTULO_ABA['email-alertas'] },
  { id: 'canais', label: ROTULO_ABA.canais },
];

export const INSTRUCOES_CONFIG_GLOBAL: Record<AbaConfiguracaoGlobal, InstrucoesAba> = {
  plataforma: {
    titulo: 'Identidade da plataforma',
    resumo: 'Nome, domínio e contatos exibidos para suporte e integrações.',
    passos: [
      {
        titulo: 'Nome da plataforma',
        descricao:
          'Texto exibido no painel e em comunicações internas. Use o nome comercial do produto (ex.: Notificação SaaS).',
      },
      {
        titulo: 'Domínio principal',
        descricao:
          'URL base da instalação em produção, sem barra no final. Em desenvolvimento use localhost ou o host do deploy.',
        links: [
          {
            rotulo: 'Documentação — URLs em produção',
            url: 'https://developer.mozilla.org/pt-BR/docs/Learn/Common_questions/Web_mechanics/What_is_a_URL',
          },
        ],
      },
      {
        titulo: 'E-mail de suporte',
        descricao:
          'Caixa monitorada pela equipe da plataforma. Pode aparecer em mensagens de erro e na documentação para clientes.',
      },
      {
        titulo: 'Timezone padrão (UTC)',
        descricao:
          'Deslocamento em horas em relação ao UTC. Exemplos: 0 = Londres (inverno), -3 = Brasília/Bahia, -4 = Manaus.',
        links: [
          {
            rotulo: 'Lista de fusos (IANA)',
            url: 'https://en.wikipedia.org/wiki/List_of_tz_database_time_zones',
          },
        ],
      },
    ],
    dica: 'O fuso usado nas regras de envio de cada organização pode ser diferente; este valor é o padrão global da instalação.',
  },
  'email-alertas': {
    titulo: 'SMTP global e alertas operacionais',
    resumo:
      'Necessário para enviar e-mails de alerta quando a fila falha, a sessão WhatsApp pausa ou integrações externas reportam erro.',
    passos: [
      {
        titulo: '1. Escolha o provedor SMTP',
        descricao:
          'Gmail, Outlook, SendGrid, Amazon SES e outros funcionam. Para testes rápidos, Gmail com senha de app é o caminho mais simples.',
      },
      {
        titulo: '2. Gmail — ative a verificação em duas etapas',
        descricao:
          'Senhas de app só ficam disponíveis com 2FA ativo na conta Google.',
        links: [
          {
            rotulo: 'Segurança da Conta Google',
            url: 'https://myaccount.google.com/security',
          },
        ],
      },
      {
        titulo: '3. Gmail — gere uma senha de app',
        descricao:
          'Crie uma senha de 16 caracteres para "Outro" / "Mail" e cole no campo Senha SMTP abaixo. Não use a senha normal da conta.',
        links: [
          {
            rotulo: 'Senhas de app do Google',
            url: 'https://myaccount.google.com/apppasswords',
          },
        ],
      },
      {
        titulo: '4. Preencha host, porta e usuário',
        descricao:
          'Gmail: host smtp.gmail.com, porta 587, usuário = seu e-mail completo. Outlook: smtp.office365.com, porta 587.',
        links: [
          {
            rotulo: 'Gmail — configurações SMTP',
            url: 'https://support.google.com/a/answer/176600?hl=pt-BR',
          },
          {
            rotulo: 'Outlook — SMTP',
            url: 'https://support.microsoft.com/pt-br/office/configurações-do-servidor-que-você-precisa-de-provedor-de-e-mail-9971d719-69ad-46ab-83da-5d443d81501e',
          },
        ],
      },
      {
        titulo: '5. E-mail para alertas (super admin)',
        descricao:
          'Recebe avisos quando nenhuma organização tiver e-mail de alertas configurado. Cada organização pode definir o próprio em Configurações → Geral.',
      },
    ],
    dica: 'A senha SMTP é salva em texto utilizável pela API (não é exibida de novo). Se já existir senha, deixe o campo em branco para mantê-la.',
  },
  canais: {
    titulo: 'Canais e capacidades',
    resumo: 'Habilita ou desabilita recursos disponíveis para todas as organizações da instalação.',
    passos: [
      {
        titulo: 'WhatsApp padrão',
        descricao:
          'Mantém o WhatsApp como canal principal sugerido nas integrações. Desative apenas se a instalação for exclusivamente e-mail.',
      },
      {
        titulo: 'E-mail, Telegram e Webhooks',
        descricao:
          'Controle quais canais aparecem e podem ser usados nos planos. E-mail exige SMTP global configurado na aba anterior.',
      },
      {
        titulo: 'API pública e templates',
        descricao:
          'API pública expõe endpoints sem autenticação de organização (use com cautela). Templates permitem mensagens padronizadas por variáveis.',
      },
    ],
    dica: 'Alterações aqui afetam novas integrações imediatamente; organizações já configuradas podem precisar revisar o plano contratado.',
  },
};
