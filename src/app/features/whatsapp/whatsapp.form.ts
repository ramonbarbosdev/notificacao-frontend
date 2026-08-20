import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { normalizeBrazilWhatsappMobile } from '../../shared/helper/phone.utils';

function telefoneWhatsappValidator(control: AbstractControl): ValidationErrors | null {
  const digits = normalizeBrazilWhatsappMobile(String(control.value ?? ''));

  if (digits.length < 12 || digits.length > 13) {
    return { telefoneWhatsapp: true };
  }

  return null;
}

export function criarFormularioMensagem(fb: FormBuilder) {
  return fb.group({
    telefone: ['', [Validators.required, telefoneWhatsappValidator]],
    mensagem: ['', [Validators.required, Validators.minLength(1)]],
  });
}
