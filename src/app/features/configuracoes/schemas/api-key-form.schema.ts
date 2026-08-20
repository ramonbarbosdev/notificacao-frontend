import { z } from 'zod';

import { ApiKeyScope } from '../../../shared/types/dtos';

const API_KEY_SCOPES = [
  'NOTIFICACOES_ENVIAR',
  'NOTIFICACOES_ENVIAR_LOTE',
  'NOTIFICACOES_CONSULTAR',
  'TEMPLATES_CONSULTAR',
  'TEMPLATES_GERENCIAR',
  'CONTATOS_CONSULTAR',
  'CONTATOS_GERENCIAR',
] as const satisfies readonly ApiKeyScope[];

export const apiKeyFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome da chave.')
    .max(100, 'O nome deve ter no maximo 100 caracteres.'),
  expiraEm: z
    .string()
    .optional()
    .default('')
    .refine((value) => {
      if (!value) return true;
      const data = new Date(value);
      return !Number.isNaN(data.getTime());
    }, 'Informe uma data de expiracao valida.')
    .refine((value) => {
      if (!value) return true;
      return new Date(value).getTime() > Date.now();
    }, 'A data de expiracao deve ser futura.'),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, 'Selecione pelo menos uma permissao.'),
});

export type ApiKeyFormData = z.infer<typeof apiKeyFormSchema>;
export type ApiKeyFormErrors = Partial<Record<keyof ApiKeyFormData, string>>;
