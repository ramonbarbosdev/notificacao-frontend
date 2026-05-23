import { FormBuilder, Validators } from '@angular/forms';

export function criarFormularioMensagem(fb: FormBuilder) {
  return fb.group({
    telefone: ['', [Validators.required, Validators.minLength(10)]],
    mensagem: ['', [Validators.required]],
  });
}
