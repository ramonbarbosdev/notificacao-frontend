export interface SiteNavItem {
  label: string;
  path: string;
}

export const SITE_NAV_ITEMS: SiteNavItem[] = [
  { label: 'Início', path: '/' },
  { label: 'Sobre', path: '/sobre' },
  { label: 'Plataforma', path: '/plataforma' },
  { label: 'Integrações', path: '/integracoes' },
  { label: 'Contato', path: '/contato' },
];

export const SITE_LEGAL_LINKS: SiteNavItem[] = [
  { label: 'Política de Privacidade', path: '/privacy-policy' },
  { label: 'Termos de Uso', path: '/termos-de-uso' },
];
