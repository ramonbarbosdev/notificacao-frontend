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

// CONTATOS

export interface ContatoRequestDTO {
  canal: CanalNotificacao;
  destinatario: string;
  motivo?: string | null;
}

export interface ContatoResponseDTO {
  idContato: number;
  canal: CanalNotificacao;
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
