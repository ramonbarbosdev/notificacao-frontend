import { OrganizacaoConfiguracao, OrganizacaoConfiguracaoRequest } from '../../../shared/types/dtos';

export function montarOrgConfigRequestSnapshot(
  c: OrganizacaoConfiguracao,
  webhookRegistrarFilaSemDestinatario: boolean,
): OrganizacaoConfiguracaoRequest {
  return {
    nmExibicao: c.nmExibicao,
    dsLogoUrl: c.dsLogoUrl,
    dsIdioma: c.dsIdioma,
    timezone: c.timezone,
    nuTelefoneOperacional: c.nuTelefoneOperacional,
    dsEmailOperacional: c.dsEmailOperacional,
    dsEmailAlertas: c.dsEmailAlertas,
    whatsappReconexaoAutomatica: c.whatsappReconexaoAutomatica,
    whatsappDelayMinSegundos: c.whatsappDelayMinSegundos,
    whatsappDelayMaxSegundos: c.whatsappDelayMaxSegundos,
    whatsappSimularDigitando: c.whatsappSimularDigitando,
    whatsappLimitePorMinuto: c.whatsappLimitePorMinuto,
    whatsappLimitePorDia: c.whatsappLimitePorDia,
    whatsappModoEnvio: c.whatsappModoEnvio,
    templatesVersionamento: c.templatesVersionamento,
    templatesExigirAprovacao: c.templatesExigirAprovacao,
    templatesValidarVariaveis: c.templatesValidarVariaveis,
    retryAutomatico: c.retryAutomatico,
    retryTentativas: c.retryTentativas,
    retryIntervaloSegundos: c.retryIntervaloSegundos,
    prioridadePadrao: c.prioridadePadrao,
    expiracaoFilaHoras: c.expiracaoFilaHoras,
    auditoriaHabilitada: c.auditoriaHabilitada,
    webhookInboundUrl: c.webhookInboundUrl,
    webhookInboundHabilitado: c.webhookInboundHabilitado,
    webhookRegistrarFilaSemDestinatario,
  };
}
