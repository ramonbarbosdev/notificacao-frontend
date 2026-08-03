import { z } from 'zod';

export const planoFormSchema = z.object({
  nmPlano: z.string().trim().min(1, 'Informe o nome do plano.'),
  dsPlano: z.string().optional().default(''),
  nuLimiteMensagensMensal: z.coerce.number().min(0, 'Limite de mensagens invalido.'),
  nuLimiteUsuarios: z.coerce.number().min(0, 'Limite de usuarios invalido.'),
  nuLimiteTemplates: z.coerce.number().min(0, 'Limite de templates invalido.'),
  nuLimiteContatos: z.coerce.number().min(0, 'Limite de contatos invalido.'),
  flWhatsappHabilitado: z.boolean(),
  flEmailHabilitado: z.boolean(),
  flTelegramHabilitado: z.boolean(),
  flWebhookHabilitado: z.boolean(),
  flApiPublicaHabilitada: z.boolean(),
  flAtivo: z.boolean(),
});

export type PlanoFormData = z.infer<typeof planoFormSchema>;
export type PlanoFormErrors = Partial<Record<keyof PlanoFormData, string>>;
