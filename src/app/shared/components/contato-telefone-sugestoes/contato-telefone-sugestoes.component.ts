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

import { NotificacaoService } from '../../../core/services/notificacao.service';
import { formatPhone, maskPhoneInput } from '../../helper/phone.utils';
import { FilaNotificacaoItemDTO, StatusNotificacao } from '../../types/dtos';

interface SugestaoDestinatario {
  idNotificacao: number;
  destinatario: string;
  status: StatusNotificacao;
}

@Component({
  selector: 'app-contato-telefone-sugestoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contato-telefone-sugestoes.component.html',
})
export class ContatoTelefoneSugestoesComponent {
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly busca$ = new Subject<string>();

  readonly control = input.required<FormControl<string | null>>();
  readonly placeholder = input('+55 (71) 98118-0200');
  readonly compacto = input(false);

  readonly sugestoes = signal<SugestaoDestinatario[]>([]);
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

  selecionar(item: SugestaoDestinatario): void {
    const valorFormatado = maskPhoneInput(item.destinatario);
    this.control().setValue(valorFormatado);
    this.control().markAsTouched();
    this.aberto.set(false);
  }

  private buscarSugestoes(termo: string) {
    const digitos = termo.replace(/\D/g, '');

    return this.notificacaoService
      .listar({
        page: 0,
        size: 20,
        sort: 'dtCriacao,desc',
        canal: 'WHATSAPP',
        ...(digitos.length >= 2 ? { destinatario: digitos } : {}),
      })
      .pipe(
        map((page) => this.deduplicarDestinatarios(page.data)),
        catchError(() => of([] as SugestaoDestinatario[])),
      );
  }

  private deduplicarDestinatarios(itens: FilaNotificacaoItemDTO[]): SugestaoDestinatario[] {
    const vistos = new Set<string>();
    const resultado: SugestaoDestinatario[] = [];

    for (const item of itens) {
      const destinatario = item.destinatario?.trim();
      if (!destinatario || vistos.has(destinatario)) {
        continue;
      }

      vistos.add(destinatario);
      resultado.push({
        idNotificacao: item.idNotificacao,
        destinatario,
        status: item.status,
      });

      if (resultado.length >= 8) {
        break;
      }
    }

    return resultado;
  }
}
