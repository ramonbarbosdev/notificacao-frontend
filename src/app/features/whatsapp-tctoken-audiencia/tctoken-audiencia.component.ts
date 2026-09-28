import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  LoaderCircle,
  LucideAngularModule,
  RefreshCw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-angular';
import { Subscription, timer } from 'rxjs';

import { TcTokenAudienciaService } from '../../core/services/tctoken-audiencia.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { formatRelativeTimePtBr } from '../../shared/helper/date.utils';
import { formatPhone } from '../../shared/helper/phone.utils';
import {
  TcTokenAudienciaLinhaResponse,
  TcTokenAudienciaOrigem,
  TcTokenAudienciaScanResponse,
  TcTokenAudienciaSituacao,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';
import { ehWhatsappConectado, extrairMensagemErro } from '../whatsapp/whatsapp.helpers';

type FiltroOrigem = '' | 'GITHUB' | 'FILA' | 'AMBOS';
type FiltroSituacao = '' | TcTokenAudienciaSituacao;

@Component({
  selector: 'app-tctoken-audiencia',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './tctoken-audiencia.component.html',
})
export class TcTokenAudienciaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly audienciaService = inject(TcTokenAudienciaService);
  private readonly whatsappService = inject(WhatsappService);

  private pollSub: Subscription | null = null;
  private ultimoRefreshManual = 0;

  protected readonly refreshIcon = RefreshCw;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly searchIcon = Search;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly helpIcon = HelpCircle;
  protected readonly okIcon = CheckCircle2;
  protected readonly warnIcon = AlertTriangle;
  protected readonly dangerIcon = XCircle;
  protected readonly shieldIcon = ShieldAlert;

  readonly carregando = signal(false);
  readonly carregandoRefresh = signal(false);
  readonly erro = signal<string | null>(null);
  readonly scan = signal<TcTokenAudienciaScanResponse | null>(null);
  readonly statusSessao = signal<WhatsappStatusResponse | null>(null);

  readonly filtros = this.fb.group({
    busca: [''],
    origem: ['' as FiltroOrigem],
    situacao: ['' as FiltroSituacao],
  });

  readonly aguardandoVarreduraGateway = computed(
    () => this.scan() != null && this.scan()!.varreduraGatewayCompleta === false && !this.sessaoConectada(),
  );

  readonly sessaoConectada = computed(() =>
    ehWhatsappConectado(this.statusSessao()?.status, this.statusSessao()?.conectado),
  );

  readonly linhasFiltradas = computed(() => {
    const dados = this.scan()?.linhas ?? [];
    const busca = (this.filtros.controls.busca.value ?? '').replace(/\D/g, '');
    const origem = this.filtros.controls.origem.value ?? '';
    const situacao = this.filtros.controls.situacao.value ?? '';

    return dados.filter((linha) => {
      if (busca && !linha.telefone.includes(busca)) {
        return false;
      }
      if (origem === 'GITHUB' && !linha.origens.includes('GITHUB')) {
        return false;
      }
      if (origem === 'FILA' && !linha.origens.includes('FILA')) {
        return false;
      }
      if (origem === 'AMBOS' && !(linha.origens.includes('GITHUB') && linha.origens.includes('FILA'))) {
        return false;
      }
      if (situacao && linha.situacao !== situacao) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.whatsappService.status().subscribe({
      next: (status) => {
        this.statusSessao.set(status);
        this.carregar(false);
      },
      error: () => {
        this.statusSessao.set(null);
        this.carregar(false);
      },
    });
    this.pollSub = timer(120_000, 120_000).subscribe(() => this.carregar(false, true));
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  carregarStatusSessao(): void {
    this.whatsappService.status().subscribe({
      next: (status) => this.statusSessao.set(status),
      error: () => this.statusSessao.set(null),
    });
  }

  carregar(forceRefresh = false, silencioso = false): void {
    if (forceRefresh) {
      const agora = Date.now();
      if (agora - this.ultimoRefreshManual < 60_000) {
        this.erro.set('Aguarde 1 minuto antes de atualizar novamente.');
        return;
      }
      this.ultimoRefreshManual = agora;
    }

    if (!silencioso) {
      this.carregando.set(true);
    }
    if (forceRefresh) {
      this.carregandoRefresh.set(true);
    }
    this.erro.set(null);

    this.audienciaService.obter(forceRefresh).subscribe({
      next: (resposta) => {
        this.scan.set(resposta);
        this.carregando.set(false);
        this.carregandoRefresh.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.erro.set(extrairMensagemErro(err, 'Não foi possível carregar a monitoração WhatsApp.'));
        this.carregando.set(false);
        this.carregandoRefresh.set(false);
      },
    });
  }

  formatarTelefone(telefone: string | null | undefined): string {
    if (!telefone) {
      return '—';
    }
    return formatPhone(telefone);
  }

  formatarDias(valor: number | null | undefined): string {
    if (valor == null || Number.isNaN(valor)) {
      return '—';
    }
    return `${Math.round(valor)}d`;
  }

  rotuloUltimaVarredura(): string {
    const atualizado = this.scan()?.atualizadoEm;
    if (!atualizado) {
      return '—';
    }
    return formatRelativeTimePtBr(atualizado);
  }

  rotuloOrigens(origens: TcTokenAudienciaOrigem[]): string {
    const partes: string[] = [];
    if (origens.includes('GITHUB')) {
      partes.push('GitHub');
    }
    if (origens.includes('FILA')) {
      partes.push('Fila');
    }
    return partes.join(' · ') || '—';
  }

  classeSituacao(situacao: TcTokenAudienciaSituacao): string {
    switch (situacao) {
      case 'OK':
        return 'text-[var(--color-success)]';
      case 'PROXIMO_EXPIRAR':
        return 'app-text-warning';
      case 'EXPIRADO':
        return 'text-[var(--color-danger)]';
      case 'AUSENTE':
      default:
        return 'text-[var(--color-text-muted)]';
    }
  }

  rotuloLiberado(linha: TcTokenAudienciaLinhaResponse): string {
    if (linha.liberadoIndisponivel || linha.prontoParaEnvio == null) {
      return 'Indisponível';
    }
    return linha.prontoParaEnvio ? 'Sim' : 'Não';
  }

  expiraCritico(linha: TcTokenAudienciaLinhaResponse): boolean {
    const scan = this.scan();
    if (!scan || linha.expiraEmDias == null) {
      return false;
    }
    return linha.expiraEmDias <= scan.janelaAlertaDias;
  }
}
