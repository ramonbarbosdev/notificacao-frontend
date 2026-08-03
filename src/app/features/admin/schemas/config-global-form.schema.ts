import { z } from 'zod';

import { AbaConfiguracaoGlobal } from '../configuracoes-globais/configuracoes-globais.data';

export const configGlobalPlataformaSchema = z.object({
  nmPlataforma: z.string().trim().min(1, 'Informe o nome da plataforma.'),
  nmDominioPrincipal: z.string().trim().min(1, 'Informe o dominio principal.'),
  nmEmailSuporte: z.string().trim().email('Informe um e-mail de suporte valido.'),
  nuTimezonePadrao: z.coerce.number(),
});

export const configGlobalEmailAlertasSchema = z.object({
  nmEmailAlertas: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Informe um e-mail de alertas valido.',
    }),
  dsSmtpHost: z.string().optional().default(''),
  nuSmtpPorta: z.coerce.number().min(1, 'Informe a porta SMTP.').max(65535, 'Porta SMTP invalida.'),
  nmSmtpUsuario: z.string().optional().default(''),
  dsSmtpSenha: z.string().optional().default(''),
});

export const configGlobalCanaisSchema = z.object({
  flWhatsappProviderPadrao: z.boolean(),
  flEmailHabilitado: z.boolean(),
  flTelegramHabilitado: z.boolean(),
  flWebhooksHabilitado: z.boolean(),
  flApiPublicaHabilitada: z.boolean(),
  flTemplatesHabilitado: z.boolean(),
});

export const configGlobalFormSchema = configGlobalPlataformaSchema
  .merge(configGlobalEmailAlertasSchema)
  .merge(configGlobalCanaisSchema);

export type ConfigGlobalFormData = z.infer<typeof configGlobalFormSchema>;
export type ConfigGlobalFormErrors = Partial<Record<keyof ConfigGlobalFormData, string>>;

export function schemaConfigGlobalPorAba(aba: AbaConfiguracaoGlobal) {
  switch (aba) {
    case 'plataforma':
      return configGlobalPlataformaSchema;
    case 'email-alertas':
      return configGlobalEmailAlertasSchema;
    case 'canais':
      return configGlobalCanaisSchema;
  }
}
