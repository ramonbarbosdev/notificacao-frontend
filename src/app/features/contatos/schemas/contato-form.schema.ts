import { z } from 'zod';

import { normalizePhone } from '../../../shared/helper/phone.utils';

export const contatoFormSchema = z
  .object({
    canal: z.enum(['WHATSAPP', 'EMAIL', 'TELEGRAM', 'WEBHOOK']),
    destinatario: z.string().trim().min(1, 'Informe o contato.'),
    nmContato: z.string().trim().min(1, 'Informe o nome do contato.'),
    motivo: z.string().trim().optional().default(''),
  })
  .superRefine((value, ctx) => {
    if (value.canal === 'WHATSAPP') {
      const telefone = normalizePhone(value.destinatario);

      if (telefone.length < 10 || telefone.length > 15) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinatario'],
          message: 'Informe um telefone válido para WhatsApp.',
        });
      }
    }

    if (value.canal === 'EMAIL') {
      const emailValido = z.string().email().safeParse(value.destinatario);

      if (!emailValido.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['destinatario'],
          message: 'Informe um e-mail válido.',
        });
      }
    }
  });

export const contatoBloqueioFormSchema = contatoFormSchema.safeExtend({
  motivo: z.string().trim().min(1, 'Informe o motivo para bloquear o contato.'),
});

export type ContatoFormData = z.infer<typeof contatoFormSchema>;
export type ContatoFormErrors = Partial<Record<keyof ContatoFormData, string>>;