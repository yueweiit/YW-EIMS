import { getExternalSystemUrl } from "@/config/external-system-config";

export interface ExternalSystem {
  nameKey: App.I18n.I18nKey;
  icon: string;
  href: string;
  getHref?: () => string;
  color: string;
  routeName: string;
  routePath: string;
}

export const externalSystems: ExternalSystem[] = [
  {
    nameKey: "page.home.externalSystems.budget",
    icon: "mdi:finance",
    href: import.meta.env.VITE_EXTERNAL_BUDGET_URL || "",
    getHref: () =>
      getExternalSystemUrl(
        "budget",
        import.meta.env.VITE_EXTERNAL_BUDGET_URL || "",
      ),
    color: "#18a058",
    routeName: "external_budget",
    routePath: "/external/budget",
  },
  {
    nameKey: "page.home.externalSystems.erp",
    icon: "mdi:domain",
    href: import.meta.env.VITE_EXTERNAL_ERP_URL || "",
    getHref: () =>
      getExternalSystemUrl(
        "erp",
        import.meta.env.VITE_EXTERNAL_ERP_URL || "",
      ),
    color: "#2080f0",
    routeName: "external_erp",
    routePath: "/external/erp",
  },
  {
    nameKey: "page.home.externalSystems.mes",
    icon: "mdi:factory",
    href: import.meta.env.VITE_EXTERNAL_MES_URL || "",
    getHref: () =>
      getExternalSystemUrl(
        "mes",
        import.meta.env.VITE_EXTERNAL_MES_URL || "",
      ),
    color: "#f0a020",
    routeName: "external_mes",
    routePath: "/external/mes",
  },
  {
    nameKey: "page.home.externalSystems.crm",
    icon: "mdi:account-group",
    href: import.meta.env.VITE_EXTERNAL_CRM_URL || "",
    getHref: () =>
      getExternalSystemUrl(
        "crm",
        import.meta.env.VITE_EXTERNAL_CRM_URL || "",
      ),
    color: "#d03050",
    routeName: "external_crm",
    routePath: "/external/crm",
  },
  {
    nameKey: "page.home.externalSystems.lemos",
    icon: "mdi:web",
    href: import.meta.env.VITE_EXTERNAL_LEMOS_URL || "",
    getHref: () =>
      getExternalSystemUrl(
        "lemos",
        import.meta.env.VITE_EXTERNAL_LEMOS_URL || "",
      ),
    color: "#8a2be2",
    routeName: "external_lemos",
    routePath: "/external/lemos",
  },
];
