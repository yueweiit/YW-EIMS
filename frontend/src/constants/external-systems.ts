export interface ExternalSystem {
  nameKey: App.I18n.I18nKey;
  icon: string;
  href: string;
  getHref?: () => string;
  color: string;
  routeName: string;
  routePath: string;
}

const erpOAuthConfig = {
  authorizeUrl:
    import.meta.env.VITE_ERP_OAUTH_AUTHORIZE_URL ||
    "http://192.168.5.202:8006/oauth/authorize",
  clientId:
    import.meta.env.VITE_ERP_OAUTH_CLIENT_ID || "eims_gYxNe_9t-dRWxKi59HGrbA",
  redirectUri:
    import.meta.env.VITE_ERP_OAUTH_REDIRECT_URI ||
    "http://192.168.5.202:8001/api/method/custom_filters.overrides.oauth.login_via_eims",
  scope: import.meta.env.VITE_ERP_OAUTH_SCOPE || "openid profile",
};

function createOAuthState() {
  const values = new Uint32Array(4);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) =>
    value.toString(16).padStart(8, "0"),
  ).join("");
}

export function buildErpOAuthAuthorizeUrl() {
  const url = new URL(erpOAuthConfig.authorizeUrl);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: erpOAuthConfig.clientId,
    redirect_uri: erpOAuthConfig.redirectUri,
    scope: erpOAuthConfig.scope,
    state: createOAuthState(),
  }).toString();
  return url.toString();
}

export const externalSystems: ExternalSystem[] = [
  {
    nameKey: "page.home.externalSystems.budget",
    icon: "mdi:finance",
    href: "http://8.135.70.130:8002",
    color: "#18a058",
    routeName: "external_budget",
    routePath: "/external/budget",
  },
  {
    nameKey: "page.home.externalSystems.erp",
    icon: "mdi:domain",
    href: "https://deeplinkerp.com",
    getHref: buildErpOAuthAuthorizeUrl,
    color: "#2080f0",
    routeName: "external_erp",
    routePath: "/external/erp",
  },
  {
    nameKey: "page.home.externalSystems.mes",
    icon: "mdi:factory",
    href: "https://lemos-case.com/mes/",
    color: "#f0a020",
    routeName: "external_mes",
    routePath: "/external/mes",
  },
  {
    nameKey: "page.home.externalSystems.crm",
    icon: "mdi:account-group",
    href: "https://lemos-case.com/crm/",
    color: "#d03050",
    routeName: "external_crm",
    routePath: "/external/crm",
  },
  {
    nameKey: "page.home.externalSystems.lemos",
    icon: "mdi:web",
    href: "https://lemos-case.com/",
    color: "#8a2be2",
    routeName: "external_lemos",
    routePath: "/external/lemos",
  },
];
