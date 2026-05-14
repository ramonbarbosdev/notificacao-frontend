// src/app/shared/types/dtos.ts

// ─── AUTH ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  login: string;       // CPF ou e-mail
  senha: string;
}

export interface LoginResponse {
  token?: string;                      // SUPER_ADMIN: token final; DEFAULT: token temporario
  tipoGlobal: 'SUPER_ADMIN' | 'DEFAULT';
  deveSelecionarOrganizacao: boolean;
  organizacoes?: Organizacao[];        // presente se DEFAULT
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

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────

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
  qrImagem: string | null;   // data URL ou base64 da imagem do QR
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

export interface EnviarMensagemResponse {
  sucesso: boolean;
  idOrganizacao: number;
  identificadorContato: string | null;
  telefone: string | null;
  estrategia: string | null;
  erro: string | null;
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

export type CanalNotificacao = 'WHATSAPP' | 'EMAIL' | 'TELEGRAM' | 'WEBHOOK';

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
  status: 'ENVIADO' | 'ERRO' | 'PENDENTE';
  erro: string | null;
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

export interface SystemStatus {
  status: string;
  uptime: number;
  version: string;
}
