import {
  getExternalSystemOAuthConfig,
  getExternalSystemUrl,
} from "@/config/external-system-config";

export interface ExternalSystem {
  nameKey: App.I18n.I18nKey;
  icon: string;
  href: string;
  getHref?: () => string;
  color: string;
  routeName: string;
  routePath: string;
}

const erpOAuthEnvConfig = {
  authorizeUrl: import.meta.env.VITE_ERP_OAUTH_AUTHORIZE_URL || "",
  clientId: import.meta.env.VITE_ERP_OAUTH_CLIENT_ID || "",
  redirectUri: import.meta.env.VITE_ERP_OAUTH_REDIRECT_URI || "",
  scope: import.meta.env.VITE_ERP_OAUTH_SCOPE || "openid profile email",
};

function createOAuthState() {
  const values = new Uint32Array(4);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    value.toString(16).padStart(8, "0"),
  ).join("");
}

export function buildErpOAuthAuthorizeUrl() {
  const erpOAuthConfig = getExternalSystemOAuthConfig("erp", erpOAuthEnvConfig);

  if (!erpOAuthConfig.authorizeUrl || !erpOAuthConfig.clientId || !erpOAuthConfig.redirectUri) {
    return getExternalSystemUrl(
      "erp",
      import.meta.env.VITE_EXTERNAL_ERP_URL || "",
    );
  }

  const url = new URL(erpOAuthConfig.authorizeUrl);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: erpOAuthConfig.clientId,
    redirect_uri: erpOAuthConfig.redirectUri,
    scope: erpOAuthConfig.scope || "openid profile email",
    state: createOAuthState(),
  }).toString();
  return url.toString();
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
    getHref: buildErpOAuthAuthorizeUrl,
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
