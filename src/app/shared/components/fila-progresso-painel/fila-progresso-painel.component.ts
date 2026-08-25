import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, Radio } from 'lucide-angular';

import { formatDateTimePtBr } from '../../helper/date.utils';
import {
  FilaNotificacaoItemDTO,
  FilaResumoResponseDTO,
  StatusNotificacao,
} from '../../types/dtos';

export type FilaTickEstado = 'pendente' | 'processando' | 'enviado' | 'falha';

export interface FilaTickView {
  id: number | string;
  estado: FilaTickEstado;
}

const STATUS_RELEVANTES: StatusNotificacao[] = [
  'PENDENTE',
  'PROCESSANDO',
  'ENVIADA',
  'ENTREGUE',
  'LIDA',
  'FALHOU',
  'BLOQUEADA',
  'CANCELADA',
];

const LIMITE_TICKS = 20;

@Component({
  selector: 'app-fila-progresso-painel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './fila-progresso-painel.component.html',
  styleUrl: './fila-progresso-painel.component.scss',
})
export class FilaProgressoPainelComponent {
  readonly itens = input<FilaNotificacaoItemDTO[]>([]);
  readonly resumo = input<FilaResumoResponseDTO | null>(null);
  readonly aoVivo = input(false);
  readonly delayMinSegundos = input<number | null>(null);
  readonly delayMaxSegundos = input<number | null>(null);

  protected readonly aoVivoIcon = Radio;

  readonly ticks = computed(() => this.montarTicks());

  readonly enviados = computed(() => {
    const resumo = this.resumo();
    if (resumo) {
      return resumo.enviada;
    }
    return this.itens().filter((item) => this.ehEnviado(item.status)).length;
  });

  readonly naFila = computed(() => {
    const resumo = this.resumo();
    if (resumo) {
      return resumo.pendente + resumo.processando;
    }
    return this.itens().filter((item) => item.status === 'PENDENTE' || item.status === 'PROCESSANDO').length;
  });

  readonly falhas = computed(() => {
    const resumo = this.resumo();
    if (resumo) {
      return resumo.falhou + resumo.bloqueada;
    }
    return this.itens().filter((item) => item.status === 'FALHOU' || item.status === 'BLOQUEADA').length;
  });

  readonly proximoEnvioTexto = computed(() => this.resumo()?.proximoEnvioTexto ?? null);

  readonly proximoEnvioEm = computed(() => {
    const valor = this.resumo()?.proximoEnvioEm;
    return valor ? formatDateTimePtBr(valor) : null;
  });

  readonly intervaloTexto = computed(() => {
    const min = this.delayMinSegundos();
    const max = this.delayMaxSegundos();
    if (min != null && max != null) {
      return `${min} a ${max} segundos, aleatorio`;
    }
    return 'Intervalo configurado nas configuracoes da organizacao';
  });

  classeTick(estado: FilaTickEstado): string {
    switch (estado) {
      case 'enviado':
        return 'queue-tick queue-tick--enviado';
      case 'processando':
        return 'queue-tick queue-tick--processando';
      case 'falha':
        return 'queue-tick queue-tick--falha';
      default:
        return 'queue-tick';
    }
  }

  private montarTicks(): FilaTickView[] {
    const itens = this.itens()
      .filter((item) => STATUS_RELEVANTES.includes(item.status))
      .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

    if (itens.length > 0) {
      const fatia = itens.slice(-LIMITE_TICKS);
      return fatia.map((item) => ({
        id: item.idNotificacao,
        estado: this.mapearEstado(item.status),
      }));
    }

    return this.ticksFromResumo(this.resumo());
  }

  private ticksFromResumo(resumo: FilaResumoResponseDTO | null): FilaTickView[] {
    if (!resumo) {
      return [];
    }

    const ticks: FilaTickView[] = [];
    const enviados = Math.min(resumo.enviada, 8);
    const processando = Math.min(resumo.processando, 3);
    const pendentes = Math.min(resumo.pendente, 9);
    const falhas = Math.min(resumo.falhou + resumo.bloqueada, 4);

    for (let i = 0; i < enviados; i++) {
      ticks.push({ id: `enviado-${i}`, estado: 'enviado' });
    }
    for (let i = 0; i < processando; i++) {
      ticks.push({ id: `processando-${i}`, estado: 'processando' });
    }
    for (let i = 0; i < pendentes; i++) {
      ticks.push({ id: `pendente-${i}`, estado: 'pendente' });
    }
    for (let i = 0; i < falhas; i++) {
      ticks.push({ id: `falha-${i}`, estado: 'falha' });
    }

    return ticks.slice(0, LIMITE_TICKS);
  }

  private mapearEstado(status: StatusNotificacao): FilaTickEstado {
    if (status === 'PROCESSANDO') {
      return 'processando';
    }
    if (status === 'PENDENTE') {
      return 'pendente';
    }
    if (this.ehEnviado(status)) {
      return 'enviado';
    }
    return 'falha';
  }

  private ehEnviado(status: StatusNotificacao): boolean {
    return status === 'ENVIADA' || status === 'ENTREGUE' || status === 'LIDA';
  }
}
