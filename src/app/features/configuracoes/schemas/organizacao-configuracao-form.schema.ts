import { z } from 'zod';

import { normalizeBrazilWhatsappMobile } from '../../../shared/helper/phone.utils';

export type AbaConfiguracaoOrganizacao =
  | 'geral'
  | 'whatsapp'
  | 'templates'
  | 'notificacoes';

const emailOpcional = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Informe um e-mail valido.',
  });

export const orgConfigGeralSchema = z.object({
  nmExibicao: z.string().trim().min(1, 'Informe o nome de exibicao.'),
  dsLogoUrl: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((value) => !value || z.string().url().safeParse(value).success, {
      message: 'Informe uma URL valida para a logo.',
    }),
  dsIdioma: z.string().trim().min(2, 'Informe o idioma (ex.: pt-BR).'),
  timezone: z.string().trim().min(1, 'Informe o fuso horario.'),
  nuTelefoneOperacional: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((value) => {
      if (!value) return true;
      const telefone = normalizeBrazilWhatsappMobile(value);
      return telefone.length >= 10 && telefone.length <= 15;
    }, 'Informe um telefone operacional valido.'),
  dsEmailOperacional: emailOpcional,
  dsEmailAlertas: emailOpcional,
});

export const orgConfigWhatsappBaseSchema = z.object({
  whatsappReconexaoAutomatica: z.boolean(),
  whatsappDelayMinSegundos: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(0, 'O delay minimo nao pode ser negativo.')
    .max(300, 'O delay minimo deve ser no maximo 300 segundos.'),
  whatsappDelayMaxSegundos: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(0, 'O delay maximo nao pode ser negativo.')
    .max(600, 'O delay maximo deve ser no maximo 600 segundos.'),
  whatsappSimularDigitando: z.boolean(),
  whatsappLimitePorMinuto: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(1, 'Informe pelo menos 1 envio por minuto.')
    .max(120, 'O limite por minuto deve ser no maximo 120.'),
  whatsappLimitePorDia: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(1, 'Informe pelo menos 1 envio por dia.')
    .max(10000, 'O limite diario deve ser no maximo 10000.'),
  whatsappModoEnvio: z.enum(['SEGURO', 'BALANCEADO', 'AGRESSIVO'], {
    error: 'Selecione o modo de envio.',
  }),
});

export const orgConfigWhatsappSchema = orgConfigWhatsappBaseSchema.superRefine((value, ctx) => {
  if (value.whatsappDelayMinSegundos > value.whatsappDelayMaxSegundos) {
    ctx.addIssue({
      code: 'custom',
      path: ['whatsappDelayMaxSegundos'],
      message: 'O delay maximo deve ser maior ou igual ao minimo.',
    });
  }
});

export const orgConfigTemplatesSchema = z.object({
  templatesVersionamento: z.boolean(),
  templatesExigirAprovacao: z.boolean(),
  templatesValidarVariaveis: z.boolean(),
});

export const orgConfigNotificacoesBaseSchema = z.object({
  retryAutomatico: z.boolean(),
  retryTentativas: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(0, 'Informe zero ou mais tentativas.')
    .max(10, 'No maximo 10 tentativas.'),
  retryIntervaloSegundos: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(1, 'Informe pelo menos 1 segundo.')
    .max(86400, 'O intervalo deve ser no maximo 86400 segundos.'),
  prioridadePadrao: z.enum(['BAIXA', 'NORMAL', 'ALTA'], {
    error: 'Selecione a prioridade padrao.',
  }),
  expiracaoFilaHoras: z.coerce
    .number()
    .int('Use um numero inteiro.')
    .min(1, 'Informe pelo menos 1 hora.')
    .max(720, 'A expiracao deve ser no maximo 720 horas.'),
  auditoriaHabilitada: z.boolean(),
});

export const orgConfigNotificacoesSchema = orgConfigNotificacoesBaseSchema.superRefine((value, ctx) => {
  if (value.retryAutomatico && value.retryTentativas < 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['retryTentativas'],
      message: 'Com retry automatico, informe pelo menos 1 tentativa.',
    });
  }
});

export type OrganizacaoConfiguracaoFormData =
  z.infer<typeof orgConfigGeralSchema> &
  z.infer<typeof orgConfigWhatsappBaseSchema> &
  z.infer<typeof orgConfigTemplatesSchema> &
  z.infer<typeof orgConfigNotificacoesBaseSchema>;
export type OrganizacaoConfiguracaoFormErrors = Partial<
  Record<keyof OrganizacaoConfiguracaoFormData, string>
>;

export const CAMPOS_POR_ABA_ORG: Record<AbaConfiguracaoOrganizacao, (keyof OrganizacaoConfiguracaoFormData)[]> = {
  geral: [
    'nmExibicao',
    'dsLogoUrl',
    'dsIdioma',
    'timezone',
    'nuTelefoneOperacional',
    'dsEmailOperacional',
    'dsEmailAlertas',
  ],
  whatsapp: [
    'whatsappReconexaoAutomatica',
    'whatsappDelayMinSegundos',
    'whatsappDelayMaxSegundos',
    'whatsappSimularDigitando',
    'whatsappLimitePorMinuto',
    'whatsappLimitePorDia',
    'whatsappModoEnvio',
  ],
  templates: [
    'templatesVersionamento',
    'templatesExigirAprovacao',
    'templatesValidarVariaveis',
  ],
  notificacoes: [
    'retryAutomatico',
    'retryTentativas',
    'retryIntervaloSegundos',
    'prioridadePadrao',
    'expiracaoFilaHoras',
    'auditoriaHabilitada',
  ],
};

export function schemaOrganizacaoConfigPorAba(aba: AbaConfiguracaoOrganizacao) {
  switch (aba) {
    case 'geral':
      return orgConfigGeralSchema;
    case 'whatsapp':
      return orgConfigWhatsappSchema;
    case 'templates':
      return orgConfigTemplatesSchema;
    case 'notificacoes':
      return orgConfigNotificacoesSchema;
  }
}
