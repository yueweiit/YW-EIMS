export interface ExternalSystem {
  nameKey: App.I18n.I18nKey;
  icon: string;
  href: string;
  color: string;
  routeName: string;
  routePath: string;
}

export const externalSystems: ExternalSystem[] = [
  {
    nameKey: 'page.home.externalSystems.budget',
    icon: 'mdi:finance',
    href: 'http://8.135.70.130:8002',
    color: '#18a058',
    routeName: 'external_budget',
    routePath: '/external/budget'
  },
  {
    nameKey: 'page.home.externalSystems.erp',
    icon: 'mdi:domain',
    href: 'https://deeplinkerp.com',
    color: '#2080f0',
    routeName: 'external_erp',
    routePath: '/external/erp'
  },
  {
    nameKey: 'page.home.externalSystems.mes',
    icon: 'mdi:factory',
    href: 'https://lemos-case.com/mes/',
    color: '#f0a020',
    routeName: 'external_mes',
    routePath: '/external/mes'
  },
  {
    nameKey: 'page.home.externalSystems.crm',
    icon: 'mdi:account-group',
    href: 'https://lemos-case.com/crm/',
    color: '#d03050',
    routeName: 'external_crm',
    routePath: '/external/crm'
  },
  {
    nameKey: 'page.home.externalSystems.lemos',
    icon: 'mdi:web',
    href: 'https://lemos-case.com/',
    color: '#8a2be2',
    routeName: 'external_lemos',
    routePath: '/external/lemos'
  }
];
