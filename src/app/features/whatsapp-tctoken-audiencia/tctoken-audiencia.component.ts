import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  HelpCircle,
  Link2,
  LoaderCircle,
  LucideAngularModule,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  X,
  XCircle,
} from 'lucide-angular';
import { Subscription, timer } from 'rxjs';

import { TokenService } from '../../core/auth/token.service';
import { OrganizacaoConfiguracaoService } from '../../core/services/organizacao-configuracao.service';
import { TcTokenAudienciaService } from '../../core/services/tctoken-audiencia.service';
import { ToastService } from '../../core/services/toast.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { formatDateTimePtBr, formatRelativeTimePtBr } from '../../shared/helper/date.utils';
import { formatPhone } from '../../shared/helper/phone.utils';
import {
  montarMensagemPedirConfirmacao,
  situacaoElegivelPedirConfirmacao,
  textoLinkWaMeConfirmacao,
} from '../../shared/helper/tctoken-confirmacao.utils';
import { buildWhatsappMeLink } from '../../shared/helper/whatsapp-link.utils';
import {
  TcTokenAudienciaLinhaResponse,
  TcTokenAudienciaOrigem,
  TcTokenAudienciaScanResponse,
  TcTokenAudienciaSituacao,
  WhatsappDiagnosticoContatoResponse,
  WhatsappStatusResponse,
} from '../../shared/types/dtos';
import { ehWhatsappConectado, extrairMensagemErro } from '../whatsapp/whatsapp.helpers';
import { EnvioMensagensToggleComponent } from '../../shared/components/envio-mensagens-toggle/envio-mensagens-toggle.component';

type FiltroOrigem = '' | 'GITHUB' | 'FILA' | 'AMBOS';
type FiltroSituacao = '' | TcTokenAudienciaSituacao;

@Component({
  selector: 'app-tctoken-audiencia',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LucideAngularModule, EnvioMensagensToggleComponent],
  templateUrl: './tctoken-audiencia.component.html',
})
export class TcTokenAudienciaComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly audienciaService = inject(TcTokenAudienciaService);
  private readonly whatsappService = inject(WhatsappService);
  private readonly tokenService = inject(TokenService);
  private readonly configService = inject(OrganizacaoConfiguracaoService);
  private readonly toast = inject(ToastService);

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
  protected readonly diagIcon = Stethoscope;
  protected readonly linkIcon = Link2;
  protected readonly confirmIcon = MessageSquare;
  protected readonly copyIcon = Copy;
  protected readonly closeIcon = X;
  protected readonly checkIcon = Check;
  protected readonly xIcon = XCircle;

  readonly formatarDataDiagnostico = formatDateTimePtBr;

  readonly carregando = signal(false);
  readonly carregandoRefresh = signal(false);
  readonly erro = signal<string | null>(null);
  readonly scan = signal<TcTokenAudienciaScanResponse | null>(null);
  readonly statusSessao = signal<WhatsappStatusResponse | null>(null);
  readonly envioMensagensHabilitado = signal(true);

  readonly linhaDiagnosticoAberta = signal<TcTokenAudienciaLinhaResponse | null>(null);
  readonly diagnosticoContato = signal<WhatsappDiagnosticoContatoResponse | null>(null);
  readonly carregandoDiagnosticoTelefone = signal<string | null>(null);
  readonly erroDiagnostico = signal<string | null>(null);

  readonly linhaConfirmacaoModal = signal<TcTokenAudienciaLinhaResponse | null>(null);
  readonly mensagemConfirmacao = signal('');
  readonly confirmacaoModoTeste = signal(false);
  readonly enviandoConfirmacao = signal(false);
  readonly acaoLinhaTelefone = signal<string | null>(null);

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
    this.configService.buscar().subscribe({
      next: (config) => this.envioMensagensHabilitado.set(config.envioMensagensHabilitado !== false),
      error: () => this.envioMensagensHabilitado.set(true),
    });

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

  /** Mesmo critério do roleGuard / envio-mensagens: role no JWT da org. */
  isAdmin(): boolean {
    return this.tokenService.role() === 'ADMIN';
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

  abrirDiagnostico(linha: TcTokenAudienciaLinhaResponse): void {
    if (!this.sessaoConectada()) {
      this.toast.error('Sessão desconectada', 'Conecte o WhatsApp antes do diagnóstico.');
      return;
    }

    this.linhaDiagnosticoAberta.set(linha);
    this.diagnosticoContato.set(null);
    this.erroDiagnostico.set(null);
    this.carregandoDiagnosticoTelefone.set(linha.telefone);

    this.whatsappService.diagnosticarContato(linha.telefone).subscribe({
      next: (resposta) => {
        this.diagnosticoContato.set(resposta);
        this.carregandoDiagnosticoTelefone.set(null);
        if (resposta.erro && resposta.sucesso === false) {
          this.erroDiagnostico.set(resposta.erro);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.carregandoDiagnosticoTelefone.set(null);
        this.erroDiagnostico.set(extrairMensagemErro(err, 'Não foi possível consultar o diagnóstico.'));
      },
    });
  }

  fecharDiagnostico(): void {
    this.linhaDiagnosticoAberta.set(null);
    this.diagnosticoContato.set(null);
    this.erroDiagnostico.set(null);
  }

  async copiarLinkWaMe(linha: TcTokenAudienciaLinhaResponse): Promise<void> {
    const link = buildWhatsappMeLink(linha.telefone, textoLinkWaMeConfirmacao());
    if (!link) {
      this.toast.error('Telefone inválido');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      this.toast.success('Link wa.me copiado');
    } catch {
      this.toast.error('Não foi possível copiar o link');
    }
  }

  abrirModalConfirmacao(linha: TcTokenAudienciaLinhaResponse): void {
    this.linhaConfirmacaoModal.set(linha);
    this.mensagemConfirmacao.set(montarMensagemPedirConfirmacao(linha));
    this.confirmacaoModoTeste.set(!this.podePedirConfirmacao(linha));
    this.enviandoConfirmacao.set(false);
  }

  fecharModalConfirmacao(): void {
    this.linhaConfirmacaoModal.set(null);
    this.confirmacaoModoTeste.set(false);
  }

  /** Admin pode abrir o fluxo (teste ou produção) com sessão e envios ativos. */
  podeAbrirModalConfirmacao(): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    return this.sessaoConectada() && this.envioMensagensHabilitado();
  }

  podeEnfileirarConfirmacaoModal(): boolean {
    const linha = this.linhaConfirmacaoModal();
    if (!linha || !this.podeAbrirModalConfirmacao()) {
      return false;
    }
    if (this.podePedirConfirmacao(linha)) {
      return true;
    }
    return this.confirmacaoModoTeste();
  }

  podePedirConfirmacao(linha: TcTokenAudienciaLinhaResponse): boolean {
    if (!this.isAdmin()) {
      return false;
    }
    if (!this.sessaoConectada() || !this.envioMensagensHabilitado()) {
      return false;
    }
    if (!linha.consultadoNoGateway) {
      return false;
    }
    return situacaoElegivelPedirConfirmacao(linha.situacao);
  }

  motivoConfirmacaoBloqueada(linha: TcTokenAudienciaLinhaResponse): string | null {
    if (this.podePedirConfirmacao(linha)) {
      return null;
    }
    if (this.podeAbrirModalConfirmacao()) {
      return 'Toque para testar (modo admin)';
    }
    return this.tooltipPedirConfirmacao(linha);
  }

  clicarPedirConfirmacao(linha: TcTokenAudienciaLinhaResponse): void {
    if (!this.isAdmin()) {
      this.toast.info('Confirmação indisponível', this.tooltipPedirConfirmacao(linha));
      return;
    }
    if (!this.podeAbrirModalConfirmacao()) {
      this.toast.info('Confirmação indisponível', this.tooltipPedirConfirmacao(linha));
      return;
    }
    this.abrirModalConfirmacao(linha);
  }

  tooltipPedirConfirmacao(linha: TcTokenAudienciaLinhaResponse): string {
    if (!this.isAdmin()) {
      return 'Somente administradores podem pedir confirmação.';
    }
    if (!this.sessaoConectada()) {
      return 'Conecte a sessão WhatsApp para enviar.';
    }
    if (!this.envioMensagensHabilitado()) {
      return 'Envios da organização estão desativados.';
    }
    if (!linha.consultadoNoGateway) {
      return 'Número fora do escopo de consulta gateway.';
    }
    if (!situacaoElegivelPedirConfirmacao(linha.situacao)) {
      return '';
    }
    return 'Enviar mensagem pedindo resposta no WhatsApp (renova conversa/token).';
  }

  confirmarPedido(): void {
    const linha = this.linhaConfirmacaoModal();
    if (!linha || this.enviandoConfirmacao() || !this.podeEnfileirarConfirmacaoModal()) {
      return;
    }

    const modoTeste = this.confirmacaoModoTeste();

    this.enviandoConfirmacao.set(true);
    this.acaoLinhaTelefone.set(linha.telefone);

    this.audienciaService
      .pedirConfirmacao({
        telefone: linha.telefone,
        mensagem: this.mensagemConfirmacao().trim() || undefined,
        modoTeste: modoTeste || undefined,
      })
      .subscribe({
        next: () => {
          this.enviandoConfirmacao.set(false);
          this.acaoLinhaTelefone.set(null);
          this.fecharModalConfirmacao();
          this.toast.success('Pedido de confirmação enfileirado');
          this.carregar(false, true);
        },
        error: (err: HttpErrorResponse) => {
          this.enviandoConfirmacao.set(false);
          this.acaoLinhaTelefone.set(null);
          const msg = extrairMensagemErro(err, 'Não foi possível enfileirar o pedido.');
          this.toast.error('Erro ao pedir confirmação', msg);
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
