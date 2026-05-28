import { CommonModule } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  Ban,
  LoaderCircle,
  LucideAngularModule,
  ShieldCheck,
} from 'lucide-angular';

import { SidePanelComponent } from '../../../../shared/components/side-panel/side-panel.component';
import { CanalNotificacao, ContatoResponseDTO } from '../../../../shared/types/dtos';
import { ContatoFormData, ContatoFormErrors } from '../../schemas/contato-form.schema';
import { FormTextareaComponent } from '../../../../shared/components/forms/textarea-input/form-textarea.component';
import { FormInputComponent } from '../../../../shared/components/forms/text-input/app-text-input';
import { FormSelectComponent } from '../../../../shared/components/forms/select-input/form-select.component';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

type AcaoContato = 'consentimento' | 'bloqueio' | 'sync' | 'import' | 'export' | null;

@Component({
  selector: 'app-form-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    SidePanelComponent,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
  ],
  templateUrl: './form-panel.component.html',
})
export class FormPanelComponent {
  open = input.required<boolean>();
  isEdit = input.required<boolean>();
  form = input.required<FormGroup>();
  canais = input.required<CanalNotificacao[]>();
  acaoAtual = input.required<AcaoContato>();

  erro = input<string | null>(null);
  resposta = input<ContatoResponseDTO | null>(null);
  errosFormulario = input<ContatoFormErrors>({});

  placeholderDestinatario = input.required<string>();
  tipoInputDestinatario = input.required<string>();

  closed = output<void>();
  canalChange = output<void>();
  destinatarioInput = output<Event>();
  registrarConsentimento = output<void>();
  bloquearContato = output<void>();

  readonly loaderIcon = LoaderCircle;
  readonly shieldIcon = ShieldCheck;
  readonly banIcon = Ban;

  readonly canaisOptions = computed(() =>
    this.canais().map((canal) => ({
      label: canal,
      value: canal,
    }))
  );

  getControl(name: string): FormControl {
    return this.form().get(name) as FormControl;
  }

  campoErro(campo: keyof ContatoFormData): string | null {
    return this.errosFormulario()[campo] ?? null;
  }

  helperDestinatario(): string {
    const canal = this.form().get('canal')?.value;

    if (canal === 'WHATSAPP') {
      return 'Use telefone com DDI e DDD. A API receberá apenas números.';
    }

    if (canal === 'EMAIL') {
      return 'O e-mail será normalizado em minúsculas antes do envio.';
    }

    return 'Informe o identificador esperado pelo canal selecionado.';
  }
}