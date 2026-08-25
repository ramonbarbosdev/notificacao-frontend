import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LoaderCircle,
  LucideAngularModule,
  Send,
  Upload,
  X,
} from 'lucide-angular';

import { NotificacaoService } from '../../../core/services/notificacao.service';
import { WhatsappEditorMensagemComponent } from '../../../shared/components/whatsapp-editor-mensagem/whatsapp-editor-mensagem.component';
import {
  deduplicarDestinatarios,
  DestinatarioImportado,
  LIMITE_DESTINATARIOS_LOTE,
  parseDestinatariosCsv,
  parseDestinatariosJson,
  parseDestinatariosLinhas,
} from '../../../shared/helper/whatsapp-import-destinatarios';
import { formatPhone, normalizeBrazilWhatsappMobile } from '../../../shared/helper/phone.utils';
import { WhatsappConversaResponse } from '../../../shared/types/dtos';
import { extrairMensagemErro } from '../../whatsapp/whatsapp.helpers';

export interface DestinatarioNovaMensagem {
  telefone: string;
  nmContato?: string | null;
}

type ModoLote = 'selecao' | 'importar';

@Component({
  selector: 'app-whatsapp-nova-mensagem-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    WhatsappEditorMensagemComponent,
  ],
  templateUrl: './whatsapp-nova-mensagem-modal.component.html',
})
export class WhatsappNovaMensagemModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notificacaoService = inject(NotificacaoService);

  readonly aberto = input(false);
  readonly sessaoConectada = input(false);
  readonly conversasDisponiveis = input<WhatsappConversaResponse[]>([]);
  readonly destinatariosIniciais = input<DestinatarioNovaMensagem[]>([]);

  readonly fechado = output<void>();
  readonly enviado = output<number>();

  protected readonly closeIcon = X;
  protected readonly sendIcon = Send;
  protected readonly loaderIcon = LoaderCircle;
  protected readonly uploadIcon = Upload;

  readonly modoLote = signal<ModoLote>('selecao');
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly destinatariosLote = signal<DestinatarioImportado[]>([]);
  readonly telefonesSelecionados = signal<Set<string>>(new Set());

  readonly formLote = this.fb.group({
    mensagem: ['', [Validators.required, Validators.minLength(1)]],
    importacao: [''],
  });

  readonly limiteLote = LIMITE_DESTINATARIOS_LOTE;
  readonly formatarTelefone = formatPhone;

  constructor() {
    effect(() => {
      if (!this.aberto()) {
        return;
      }

      const iniciais = this.destinatariosIniciais();
      if (iniciais.length > 0) {
        this.modoLote.set('selecao');
        this.destinatariosLote.set(
          deduplicarDestinatarios(
            iniciais.map((item) => ({
              telefone: normalizeBrazilWhatsappMobile(item.telefone),
              nome: item.nmContato ?? undefined,
            })),
          ),
        );
        this.telefonesSelecionados.set(new Set(iniciais.map((i) => normalizeBrazilWhatsappMobile(i.telefone))));
      } else {
        this.resetarFormularios();
      }
    });
  }

  fechar(): void {
    if (this.enviando()) {
      return;
    }
    this.fechado.emit();
  }

  selecionarModoLote(modo: ModoLote): void {
    this.modoLote.set(modo);
    this.erro.set(null);
  }

  toggleContatoLista(conversa: WhatsappConversaResponse): void {
    const canonico = normalizeBrazilWhatsappMobile(conversa.telefone);
    const atual = new Set(this.telefonesSelecionados());

    if (atual.has(canonico)) {
      atual.delete(canonico);
    } else if (atual.size < this.limiteLote) {
      atual.add(canonico);
    }

    this.telefonesSelecionados.set(atual);
    this.sincronizarDestinatariosDaSelecao();
  }

  contatoSelecionado(conversa: WhatsappConversaResponse): boolean {
    return this.telefonesSelecionados().has(normalizeBrazilWhatsappMobile(conversa.telefone));
  }

  aplicarImportacao(): void {
    const texto = this.formLote.controls.importacao.value?.trim() ?? '';
    if (!texto) {
      this.erro.set('Cole numeros, CSV ou JSON para importar.');
      return;
    }

    try {
      let importados: DestinatarioImportado[] = [];

      if (texto.startsWith('[') || texto.startsWith('{')) {
        importados = parseDestinatariosJson(texto);
      } else if (texto.includes(',') && texto.split('\n').length <= 2) {
        importados = parseDestinatariosCsv(texto);
      } else if (texto.includes(',') || texto.toLowerCase().includes('telefone')) {
        importados = parseDestinatariosCsv(texto);
      } else {
        importados = parseDestinatariosLinhas(texto);
      }

      importados = deduplicarDestinatarios(importados);

      if (importados.length === 0) {
        this.erro.set('Nenhum telefone valido encontrado na importacao.');
        return;
      }

      this.destinatariosLote.set(importados);
      this.telefonesSelecionados.set(new Set(importados.map((i) => i.telefone)));
      this.erro.set(null);
    } catch {
      this.erro.set('Formato invalido. Use JSON, CSV (nome,telefone) ou linhas telefone;mensagem.');
    }
  }

  onArquivoImportacao(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const arquivo = inputEl.files?.[0];
    if (!arquivo) {
      return;
    }

    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = String(leitor.result ?? '');
      this.formLote.controls.importacao.setValue(conteudo);
      this.aplicarImportacao();
      inputEl.value = '';
    };
    leitor.readAsText(arquivo);
  }

  removerDestinatario(telefone: string): void {
    const canonico = normalizeBrazilWhatsappMobile(telefone);
    this.destinatariosLote.update((lista) => lista.filter((i) => i.telefone !== canonico));
    const selecionados = new Set(this.telefonesSelecionados());
    selecionados.delete(canonico);
    this.telefonesSelecionados.set(selecionados);
  }

  enviar(): void {
    if (!this.sessaoConectada()) {
      this.erro.set('Conecte o WhatsApp antes de enviar.');
      return;
    }

    const mensagemPadrao = this.formLote.controls.mensagem.value?.trim() ?? '';
    const destinatarios = this.destinatariosLote();

    if (destinatarios.length === 0) {
      this.erro.set('Selecione ou importe ao menos um destinatario.');
      return;
    }

    const itens = destinatarios.map((item) => {
      const mensagem = item.mensagem?.trim() || mensagemPadrao;
      return { destinatario: item.telefone, mensagem, referenciaExterna: item.referenciaExterna ?? null };
    });

    const semMensagem = itens.find((item) => !item.mensagem);
    if (semMensagem) {
      this.erro.set('Preencha a mensagem ou inclua mensagem por destinatario na importacao.');
      this.formLote.controls.mensagem.markAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    this.notificacaoService
      .enviarLote({
        canal: 'WHATSAPP',
        mensagens: itens,
      })
      .subscribe({
        next: (resposta) => {
          this.enviando.set(false);
          if (!resposta.sucesso) {
            this.erro.set('Algumas mensagens nao foram enfileiradas. Verifique a fila.');
            return;
          }
          this.enviado.emit(itens.length);
          this.resetarFormularios();
          this.fechado.emit();
        },
        error: (err: HttpErrorResponse) => {
          this.enviando.set(false);
          this.erro.set(extrairMensagemErro(err, 'Erro ao enviar lote.'));
        },
      });
  }

  private sincronizarDestinatariosDaSelecao(): void {
    const selecionados = this.telefonesSelecionados();
    const conversas = this.conversasDisponiveis();

    const lista: DestinatarioImportado[] = [];
    for (const conversa of conversas) {
      const telefone = normalizeBrazilWhatsappMobile(conversa.telefone);
      if (!selecionados.has(telefone)) {
        continue;
      }
      lista.push({
        telefone,
        nome: conversa.nmContato,
      });
    }

    for (const telefone of selecionados) {
      if (!lista.some((i) => i.telefone === telefone)) {
        lista.push({ telefone });
      }
    }

    this.destinatariosLote.set(deduplicarDestinatarios(lista));
  }

  private resetarFormularios(): void {
    this.formLote.reset({ mensagem: '', importacao: '' });
    this.destinatariosLote.set([]);
    this.telefonesSelecionados.set(new Set());
    this.modoLote.set('selecao');
    this.erro.set(null);
  }
}
