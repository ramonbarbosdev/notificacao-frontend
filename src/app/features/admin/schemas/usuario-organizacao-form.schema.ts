import { z } from 'zod';

import { normalizeCpf } from '../../../shared/helper/cpf.utils';

export const usuarioOrganizacaoFormSchema = z.object({
  idOrganizacao: z
    .number({ error: 'Selecione uma organizacao.' })
    .int()
    .min(1, 'Selecione uma organizacao.'),
  nuCpf: z
    .string()
    .trim()
    .min(1, 'Informe o CPF.')
    .refine((value) => normalizeCpf(value).length === 11, 'Informe um CPF valido.'),
  nmUsuario: z.string().trim().min(2, 'Informe o nome com pelo menos 2 caracteres.'),
  nmEmail: z.string().trim().email('Informe um e-mail valido.'),
  senha: z
    .string()
    .optional()
    .default('')
    .refine(
      (value) => value === '' || value.length >= 6,
      'A senha deve ter no minimo 6 caracteres.'
    ),
  role: z.enum(['ADMIN', 'USER'], { error: 'Selecione o perfil.' }),
});

export type UsuarioOrganizacaoFormData = z.infer<typeof usuarioOrganizacaoFormSchema>;
export type UsuarioOrganizacaoFormErrors = Partial<Record<keyof UsuarioOrganizacaoFormData, string>>;
