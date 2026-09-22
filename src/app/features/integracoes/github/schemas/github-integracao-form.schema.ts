import { z } from 'zod';

export const FRASE_ATIVACAO_GITHUB_PADRAO = 'Quero receber notificação, do github!';

export const GITHUB_DEFAULT_GRAPHQL_URL = 'https://api.github.com/graphql';
export const GITHUB_DEFAULT_API_BASE_URL = 'https://api.github.com';
export const GITHUB_DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
export const GITHUB_DEFAULT_READ_TIMEOUT_MS = 30_000;
export const GITHUB_DEFAULT_INSTALLATION_TOKEN_SKEW_SEGUNDOS = 300;

const githubUrlOpcional = z
  .string()
  .trim()
  .max(500, 'URL deve ter no maximo 500 caracteres.')
  .optional()
  .default('')
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: 'Informe uma URL http ou https valida.',
  });

const githubIntPositivoOpcional = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : value;
  },
  z
    .number({ error: 'Informe um numero inteiro.' })
    .int('Informe um numero inteiro.')
    .positive('Informe um valor maior que zero.')
    .nullable()
    .optional(),
);

const githubSkewOpcional = z.preprocess(
  (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const numero = Number(value);
    return Number.isFinite(numero) ? numero : value;
  },
  z
    .number({ error: 'Informe um numero inteiro.' })
    .int('Informe um numero inteiro.')
    .min(0, 'Informe um valor maior ou igual a zero.')
    .nullable()
    .optional(),
);

export const githubIntegracaoFormSchema = z.object({
  dsGithubFraseAtivacaoWhatsapp: z
    .string()
    .trim()
    .max(500, 'A frase deve ter no maximo 500 caracteres.')
    .optional()
    .default(''),
  dsGithubStatusDisparo: z.string().trim().max(500).optional().default(''),
  dsGithubStatusDisparoGatilhos: z.string().trim().max(500).optional().default(''),
  dsGithubRegrasPorStatus: z.string().trim().max(32000).optional().default(''),
  dsGithubTemplateAssuntoWhatsapp: z.string().trim().max(500).optional().default(''),
  dsGithubTemplateMensagemWhatsapp: z.string().trim().max(8000).optional().default(''),
  githubNaoNotificarMovimentador: z.boolean().default(true),
  githubNotificarStatusAlterado: z.boolean().default(true),
  githubNotificarTarefaCriada: z.boolean().default(false),
  githubNotificarResponsavelAlterado: z.boolean().default(false),
  githubNotificarTarefaAtribuida: z.boolean().default(false),
  githubIgnorarSemResponsavel: z.boolean().default(true),
  dsGithubDestinatariosModo: z
    .enum(['RESPONSAVEIS', 'RESPONSAVEIS_E_MOVIMENTADOR', 'LOGINS_CONFIGURADOS'])
    .default('RESPONSAVEIS'),
  dsGithubDestinatariosExtras: z.string().trim().max(500).optional().default(''),
  githubNotificarIssueFechadaReaberta: z.boolean().default(false),
  githubNotificarIssueLabel: z.boolean().default(false),
  githubNotificarSomenteCampoStatus: z.boolean().default(false),
  githubNotificarReordenacao: z.boolean().default(false),
  githubPrAvisarAvaliadores: z.boolean().default(false),
  dsGithubPrStatusDisparo: z.string().trim().max(500).optional().default(''),
  dsGithubPrLoginsAvaliadores: z.string().trim().max(500).optional().default(''),
  githubIssueAvisarAvaliadores: z.boolean().default(false),
  dsGithubIssueStatusDisparo: z.string().trim().max(500).optional().default(''),
  dsGithubOrganizationLogin: z.string().trim().max(100).optional().default(''),
  dsGithubProjectV2NodeId: z.string().trim().max(120).optional().default(''),
  nuGithubProjectV2Number: githubIntPositivoOpcional,
  githubAppId: githubIntPositivoOpcional,
  githubAppPrivateKey: z.string().optional().default(''),
  githubInstallationId: githubIntPositivoOpcional,
  githubGraphqlUrl: githubUrlOpcional,
  githubApiBaseUrl: githubUrlOpcional,
  githubHttpConnectTimeoutMs: githubIntPositivoOpcional,
  githubHttpReadTimeoutMs: githubIntPositivoOpcional,
  githubInstallationTokenSkewSegundos: githubSkewOpcional,
  githubGraphqlToken: z.string().optional().default(''),
  webhookRegistrarFilaSemDestinatario: z.boolean().default(true),
});

export type GithubIntegracaoFormData = z.infer<typeof githubIntegracaoFormSchema>;
export type GithubIntegracaoFormErrors = Partial<Record<keyof GithubIntegracaoFormData, string>>;

/** Compatibilidade com componentes que ainda usam o nome antigo do tipo. */
export type OrganizacaoConfiguracaoFormData = GithubIntegracaoFormData;
export type OrganizacaoConfiguracaoFormErrors = GithubIntegracaoFormErrors;
