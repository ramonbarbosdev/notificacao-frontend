import { z } from 'zod';

import { normalizeCnpj } from '../../../shared/helper/cnpj.utils';

export const organizacaoFormSchema = z.object({
  nmOrganizacao: z.string().trim().min(2, 'Informe o nome com pelo menos 2 caracteres.'),
  dsDocumento: z
    .string()
    .trim()
    .min(1, 'Informe o documento da organizacao.')
    .refine(
      (value) => {
        const digits = normalizeCnpj(value).length;
        return digits === 11 || digits === 14;
      },
      'Informe um CPF ou CNPJ valido.'
    ),
});

export type OrganizacaoFormData = z.infer<typeof organizacaoFormSchema>;
export type OrganizacaoFormErrors = Partial<Record<keyof OrganizacaoFormData, string>>;
