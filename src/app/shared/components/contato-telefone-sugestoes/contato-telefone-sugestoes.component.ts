import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
} from 'rxjs';

import { ContatoService } from '../../../core/services/contato.service';
import { formatPhone, maskPhoneInput } from '../../helper/phone.utils';
import { ContatoResponseDTO } from '../../types/dtos';

@Component({
  selector: 'app-contato-telefone-sugestoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contato-telefone-sugestoes.component.html',
})
export class ContatoTelefoneSugestoesComponent {
  private readonly contatoService = inject(ContatoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busca$ = new Subject<string>();

  readonly control = input.required<FormControl<string | null>>();
  readonly placeholder = input('+55 (71) 98118-0200');
  readonly compacto = input(false);

  readonly sugestoes = signal<ContatoResponseDTO[]>([]);
  readonly aberto = signal(false);
  readonly carregando = signal(false);

  readonly formatarTelefone = formatPhone;

  constructor() {
    this.busca$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((termo) => this.buscarSugestoes(termo)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => {
        this.sugestoes.set(lista);
        this.aberto.set(lista.length > 0);
        this.carregando.set(false);
      });
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorFormatado = maskPhoneInput(input.value);

    this.control().setValue(valorFormatado, { emitEvent: false });
    this.control().updateValueAndValidity({ emitEvent: false });
    input.value = valorFormatado;

    this.carregando.set(true);
    this.busca$.next(valorFormatado);
  }

  onFocus(): void {
    this.carregando.set(true);
    this.busca$.next(this.control().value ?? '');
  }

  onBlur(): void {
    window.setTimeout(() => this.aberto.set(false), 150);
  }

  selecionar(contato: ContatoResponseDTO): void {
    const valorFormatado = maskPhoneInput(contato.destinatario);
    this.control().setValue(valorFormatado);
    this.control().markAsTouched();
    this.aberto.set(false);
  }

  private buscarSugestoes(termo: string) {
    const digitos = termo.replace(/\D/g, '');
    const texto = termo.trim();

    return this.contatoService
      .listar({
        page: 0,
        size: 8,
        sort: 'dtCriacao,desc',
        canal: 'WHATSAPP',
        ...(digitos.length >= 2 ? { destinatario: digitos } : {}),
        ...(digitos.length < 2 && texto.length >= 2 ? { nmContato: texto } : {}),
      })
      .pipe(
        map((page) => page.data),
        catchError(() => of([] as ContatoResponseDTO[])),
      );
  }
}
