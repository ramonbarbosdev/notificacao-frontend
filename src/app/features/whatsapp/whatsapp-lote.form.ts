import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
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

export interface ItemLoteFormValue {
  telefone: string;
  mensagem: string;
  referenciaExterna: string;
}

export function criarItemLoteFormulario(
  fb: FormBuilder,
  valores?: Partial<ItemLoteFormValue>,
) {
  return fb.group({
    telefone: [valores?.telefone ?? '', [Validators.required, telefoneWhatsappValidator]],
    mensagem: [valores?.mensagem ?? '', [Validators.required, Validators.minLength(1)]],
    referenciaExterna: [valores?.referenciaExterna ?? ''],
  });
}

export function criarFormularioLote(fb: FormBuilder) {
  return fb.group({
    importacaoRapida: [''],
    itens: fb.array([
      criarItemLoteFormulario(fb),
      criarItemLoteFormulario(fb),
      criarItemLoteFormulario(fb),
    ]),
  });
}

export function itensLoteFormulario(form: FormGroup): FormArray<FormGroup> {
  return form.get('itens') as FormArray<FormGroup>;
}
