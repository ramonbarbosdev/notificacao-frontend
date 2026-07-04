export interface ApiResponseDTO<T> {
  message: string;
  data: T;
}

export interface PageResult<T> {
  data: T[];
  totalElements: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  token?: string;
  tipoGlobal: 'SUPER_ADMIN' | 'DEFAULT';
  deveSelecionarOrganizacao: boolean;
  organizacoes?: Organizacao[];
}

export interface Organizacao {
  idOrganizacao: number;
  nmOrganizacao: string;
  role: string;
}

export interface SelecionarOrganizacaoRequest {
  idOrganizacao: number;
}

export interface SelecionarOrganizacaoResponse {
  token: string;
  idOrganizacao: number;
  role: 'ADMIN' | 'USER';
}

export interface UsuarioAtual {
  idUsuario: number;
  tipoGlobal: 'SUPER_ADMIN' | 'DEFAULT';
  nmUsuario: string;
  nmEmail: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  idOrganizacao?: number;
}

// WHATSAPP

export type WhatsappStatus =
| 'NOT_STARTED'
| 'NAO_INICIADO'
| 'CONECTANDO'
  | 'CONNECTING'
  | 'PENDING_QR'
  | 'AGUARDANDO_QR'
  | 'CONECTADO'
  | 'DESCONECTADO'
  | 'DESLOGADO'
  | 'ERRO';

export interface WhatsappStatusResponse {
  sucesso: boolean;
  idOrganizacao: number;
  status: WhatsappStatus;
  conectado: boolean | null;
  qr: string | null;
  qrImagem: string | null;
  telefone: string | null;
  erro: string | null;
}

export type WhatsappEventoTipo =
  | 'TENTATIVA_INICIADA'
  | 'TENTATIVA_BLOQUEADA'
  | 'STATUS_ATUALIZADO'
  | 'CONEXAO_LIBERADA'
  | 'CONEXAO_CANCELADA';

export interface WhatsappEvento {
  idOrganizacao: number;
  tipo: WhatsappEventoTipo;
  status: WhatsappStatus | null;
  podeConectar: boolean;
  segundosRestantes: number;
  mensagem: string;
  dataHora: string;
}

export interface EnviarMensagemRequest {
  telefone: string;
  mensagem: string;
}

// NOTIFICACOES

export type CanalNotificacao = 'WHATSAPP' | 'EMAIL' | 'TELEGRAM' | 'WEBHOOK';

export type StatusNotificacao =
  | 'PENDENTE'
  | 'PROCESSANDO'
  | 'ENVIADA'
  | 'ENTREGUE'
  | 'LIDA'
  | 'FALHOU'
  | 'BLOQUEADA'
  | 'CANCELADA';

export interface EnviarNotificacaoRequest {
  canal: CanalNotificacao;
  destinatario: string;
  assunto: string;
  mensagem: string;
}

export interface EnviarNotificacaoResponse {
  sucesso: boolean;
  idNotificacao: number;
  canal: CanalNotificacao;
  status: StatusNotificacao;
  erro: string | null;
  tempoEstimadoEnvioSegundos?: number | null;
  posicaoFila?: number | null;
  tempoEstimadoEnvioTexto?: string | null;
}

export type EnviarMensagemResponse = EnviarNotificacaoResponse;

export interface FilaNotificacaoItemDTO {
  idNotificacao: number;
  canal: CanalNotificacao;
  destinatario: string;
  status: StatusNotificacao;
  provider: string | null;
  tentativas: number;
  proximaTentativa: string | null;
  erro: string | null;
  criadoEm: string;
}

export interface FilaNotificacaoResponseDTO {
  idNotificacao: number;
  canal: CanalNotificacao;
  destinatario: string;
  status: StatusNotificacao;
  provider: string | null;
  tentativas: number;
  proximaTentativa: string | null;
  erro: string | null;
  criadoEm: string;
}

// TEMPLATES

export type TipoVariavelTemplate =
  | 'TEXTO'
  | 'NUMERO'
  | 'MOEDA'
  | 'DATA'
  | 'TELEFONE'
  | 'EMAIL'
  | 'URL'
  | 'BOOLEANO';

export interface TemplateVariavelDTO {
  chave: string;
  label: string;
  tipo: TipoVariavelTemplate;
  obrigatoria: boolean;
  exemplo: string | null;
}

export interface TemplateMensagemRequestDTO {
  nome: string;
  chave: string;
  canal: CanalNotificacao;
  assunto?: string | null;
  conteudo: string;
  ativo: boolean;
  variaveis: TemplateVariavelDTO[];
  variaveisObrigatorias?: string[];
}

export interface TemplateMensagemResponseDTO {
  idModelo: number;
  idOrganizacao?: number;
  nome: string;
  chave: string;
  canal: CanalNotificacao;
  assunto: string | null;
  conteudo: string;
  ativo: boolean;
  variaveis?: TemplateVariavelDTO[];
  variaveisObrigatorias?: string[];
  versao: number;
  dtCriacao?: string | null;
  dtAtualizacao?: string | null;
}

export interface ExtrairVariaveisTemplateRequestDTO {
  conteudo: string;
}

export interface ExtrairVariaveisTemplateResponseDTO {
  variaveis: string[];
}

export interface ValidarTemplateRequestDTO {
  conteudo: string;
  variaveis: TemplateVariavelDTO[];
}

export interface ValidarTemplateResponseDTO {
  valido: boolean;
  variaveisEncontradas: string[];
  variaveisDeclaradas: string[];
  variaveisNaoDeclaradas: string[];
  variaveisDeclaradasNaoUsadas: string[];
  erros: string[];
  avisos: string[];
}

export interface TestarTemplateRequestDTO {
  variaveis: Record<string, string>;
}

export interface TestarTemplateResponseDTO {
  templateKey: string;
  canal: CanalNotificacao;
  assunto: string | null;
  mensagem: string;
  versao: number;
}

export interface EnviarTemplateRequestDTO {
  templateKey: string;
  destinatario: string;
  variaveis: Record<string, string>;
}

// CONTATOS

export interface ContatoRequestDTO {
  canal: CanalNotificacao;
  nmContato: string;
  destinatario: string;
  motivo?: string | null;
}

export interface ContatoResponseDTO {
  idContato: number;
  canal: CanalNotificacao;
  nmContato: string;
  destinatario: string;
  consentimento: boolean;
  bloqueado: boolean;
  motivoBloqueio: string | null;
  dtConsentimento: string | null;
  dtBloqueio: string | null;
}

// ADMIN

export interface SystemStatus {
  status: string;
  uptime: number;
  version: string;
}

export type RoleOrganizacao = 'ADMIN' | 'USER';

export interface CriarOrganizacaoRequest {
  nmOrganizacao: string;
  dsDocumento: string;
}

export interface AtualizarOrganizacaoRequest {
  nmOrganizacao: string;
  dsDocumento: string;
}

export interface OrganizacaoAdminResponse {
  idOrganizacao: number;
  nmOrganizacao: string;
  dsDocumento: string;
  flAtivo: boolean;
}

export interface CriarUsuarioOrganizacaoRequest {
  nuCpf: string;
  nmUsuario: string;
  nmEmail: string;
  senha: string;
  role: RoleOrganizacao;
}

export type AtualizarUsuarioOrganizacaoRequest = CriarUsuarioOrganizacaoRequest;

export interface UsuarioOrganizacaoResponse {
  idUsuario: number;
  nuCpf: string;
  nmUsuario: string;
  nmEmail: string;
  idOrganizacao: number;
  nmOrganizacao: string;
  role: RoleOrganizacao;
  flAtivo: boolean;
}

// CONFIGURACOES SAAS

export type RecursoFeature =
  | 'WHATSAPP'
  | 'EMAIL'
  | 'TELEGRAM'
  | 'WEBHOOK'
  | 'TEMPLATES'
  | 'API_PUBLICA'
  | 'ANALYTICS';

export type ApiKeyScope =
  | 'NOTIFICACOES_ENVIAR'
  | 'NOTIFICACOES_CONSULTAR'
  | 'TEMPLATES_CONSULTAR'
  | 'TEMPLATES_GERENCIAR'
  | 'CONTATOS_CONSULTAR'
  | 'CONTATOS_GERENCIAR';

export type WebhookEvento =
  | 'NOTIFICACAO_CRIADA'
  | 'NOTIFICACAO_ENVIADA'
  | 'NOTIFICACAO_ENTREGUE'
  | 'NOTIFICACAO_LIDA'
  | 'NOTIFICACAO_FALHOU'
  | 'CONTATO_BLOQUEADO'
  | 'WHATSAPP_DESCONECTADO'
  | 'WHATSAPP_QR_ATUALIZADO';

export interface ConfiguracaoGlobal {
  idConfiguracaoGlobal: number;
  nmPlataforma: string;
  nmDominioPrincipal: string;
  nmEmailSuporte: string;
  nmEmailAlertas: string | null;
  dsSmtpHost: string | null;
  nuSmtpPorta: number | null;
  nmSmtpUsuario: string | null;
  smtpSenhaConfigurada: boolean;
  nuTimezonePadrao: number | null;
  flWhatsappProviderPadrao: boolean;
  flApiPublicaHabilitada: boolean;
  flTemplatesHabilitado: boolean;
  flWebhooksHabilitado: boolean;
  flTelegramHabilitado: boolean;
  flEmailHabilitado: boolean;
  dtCriacao?: string | null;
  dtAtualizacao?: string | null;
}

export interface ConfiguracaoGlobalRequest {
  nmPlataforma: string;
  nmDominioPrincipal: string;
  nmEmailSuporte: string;
  nmEmailAlertas?: string | null;
  dsSmtpHost?: string | null;
  nuSmtpPorta?: number | null;
  nmSmtpUsuario?: string | null;
  dsSmtpSenha?: string | null;
  nuTimezonePadrao?: number | null;
  flWhatsappProviderPadrao: boolean;
  flApiPublicaHabilitada: boolean;
  flTemplatesHabilitado: boolean;
  flWebhooksHabilitado: boolean;
  flTelegramHabilitado: boolean;
  flEmailHabilitado: boolean;
}

export interface Plano {
  idPlano: number;
  nmPlano: string;
  dsPlano: string | null;
  nuLimiteMensagensMensal: number | null;
  nuLimiteUsuarios: number | null;
  nuLimiteTemplates: number | null;
  nuLimiteContatos: number | null;
  flWhatsappHabilitado: boolean;
  flEmailHabilitado: boolean;
  flTelegramHabilitado: boolean;
  flWebhookHabilitado: boolean;
  flApiPublicaHabilitada: boolean;
  flAtivo: boolean;
  dtCriacao?: string | null;
  dtAtualizacao?: string | null;
}

export type PlanoRequest = Omit<Plano, 'idPlano' | 'dtCriacao' | 'dtAtualizacao'>;

export interface FeatureFlag {
  idFeatureFlag: number | null;
  idOrganizacao: number;
  recurso: RecursoFeature;
  habilitado: boolean;
}

export interface FeatureFlagRequest {
  features: Partial<Record<RecursoFeature, boolean>>;
}

export interface OrganizacaoConfiguracao {
  idOrganizacaoConfiguracao: number;
  idOrganizacao: number;
  nmExibicao: string;
  dsLogoUrl: string | null;
  dsIdioma: string | null;
  timezone: string | null;
  nuTelefoneOperacional: string | null;
  dsEmailOperacional: string | null;
  dsEmailAlertas: string | null;
  whatsappReconexaoAutomatica: boolean;
  whatsappDelayMinSegundos: number | null;
  whatsappDelayMaxSegundos: number | null;
  whatsappSimularDigitando: boolean;
  whatsappLimitePorMinuto: number | null;
  whatsappLimitePorDia: number | null;
  whatsappModoEnvio: 'SEGURO' | 'BALANCEADO' | 'AGRESSIVO' | string;
  exigirConsentimento: boolean;
  consentimentoExpira: boolean;
  diasExpiracaoConsentimento: number | null;
  bloqueioAutomatico: boolean;
  limiteFalhasParaBloqueio: number | null;
  templatesVersionamento: boolean;
  templatesExigirAprovacao: boolean;
  templatesValidarVariaveis: boolean;
  retryAutomatico: boolean;
  retryTentativas: number | null;
  retryIntervaloSegundos: number | null;
  prioridadePadrao: string | null;
  expiracaoFilaHoras: number | null;
  auditoriaHabilitada: boolean;
  dtCriacao?: string | null;
  dtAtualizacao?: string | null;
}

export type OrganizacaoConfiguracaoRequest = Omit<
  OrganizacaoConfiguracao,
  'idOrganizacaoConfiguracao' | 'idOrganizacao' | 'dtCriacao' | 'dtAtualizacao'
>;

export interface AlertaOperacional {
  idAlerta: number;
  idOrganizacao: number | null;
  idNotificacao: number | null;
  tpOrigem: string;
  dsTitulo: string;
  dsMensagem: string;
  dsDestinatario: string | null;
  dsCanal: string | null;
  dsCodigoErro: string | null;
  flEmailEnviado: boolean;
  dtCriacao: string;
}

export interface ApiKey {
  idApiKey: number;
  nome: string;
  prefixo: string;
  scopes: ApiKeyScope[];
  ativo: boolean;
  ultimoUsoEm: string | null;
  expiraEm: string | null;
  dtCriacao: string | null;
  dtRevogacao: string | null;
}

export interface ApiKeyCreateRequest {
  nome: string;
  scopes: ApiKeyScope[];
  expiraEm?: string | null;
}

export interface ApiKeyCreatedResponse {
  idApiKey: number;
  nome: string;
  prefixo: string;
  chave: string;
  scopes: ApiKeyScope[];
  expiraEm: string | null;
  dtCriacao: string | null;
}

export interface Webhook {
  idWebhook: number;
  nome: string;
  url: string;
  secretConfigurado: boolean;
  eventos: WebhookEvento[];
  ativo: boolean;
  dtCriacao?: string | null;
  dtAtualizacao?: string | null;
}

export interface WebhookRequest {
  nome: string;
  url: string;
  secret?: string | null;
  eventos: WebhookEvento[];
  ativo: boolean;
}

export interface AuditoriaEvento {
  idAuditoria: number;
  idOrganizacao: number | null;
  idUsuario: number | null;
  role: string | null;
  modulo: string;
  acao: string;
  descricao: string;
  ip: string | null;
  userAgent: string | null;
  dadosAntes: string | null;
  dadosDepois: string | null;
  dtCriacao: string;
}
