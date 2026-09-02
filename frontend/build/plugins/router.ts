import type { RouteMeta } from "vue-router";
import ElegantVueRouter from "@elegant-router/vue/vite";
import type { RouteKey } from "@elegant-router/types";

export function setupElegantRouter() {
  const legacySystemPaths: Record<string, string> = {
    system_access: '/system/access',
    system_access_permission: '/system/permission',
    system_access_role: '/system/role',
    system_access_user: '/system/user',
    system_sso: '/system/sso',
    'system_sso_external-system': '/system/external-system',
    'system_sso_oauth2-binding': '/system/oauth2-binding',
    'system_sso_oauth2-client': '/system/oauth2-client',
    system_operations: '/system/operations',
    system_operations_audit: '/system/audit',
    'system_operations_erpnext-sync-log': '/system/erpnext-sync-log'
  };

  const systemRouteMeta: Record<string, Partial<RouteMeta>> = {
    system: { icon: 'mdi:cog-outline', order: 0 },
    system_access: { icon: 'mdi:account-cog-outline', order: 10 },
    system_access_user: {
      icon: 'mdi:account-multiple-outline',
      order: 10,
      permission: 'eims:system:user',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    system_access_role: {
      icon: 'mdi:account-key-outline',
      order: 20,
      permission: 'eims:system:role',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    system_access_permission: {
      icon: 'mdi:shield-key-outline',
      order: 30,
      permission: 'eims:system:permission',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    system_sso: { icon: 'mdi:key-link', order: 20 },
    'system_sso_external-system': {
      icon: 'mdi:apps-box',
      order: 10,
      permission: 'eims:system:external-system',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    'system_sso_oauth2-client': {
      icon: 'mdi:key-chain-variant',
      order: 20,
      permission: 'eims:system:oauth2-client',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    'system_sso_oauth2-binding': {
      icon: 'mdi:link-variant',
      order: 30,
      permission: 'eims:system:oauth2-binding',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    system_operations: { icon: 'mdi:clipboard-pulse-outline', order: 30 },
    system_operations_audit: {
      icon: 'mdi:clipboard-text-clock-outline',
      order: 10,
      permission: 'eims:system:audit',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    'system_operations_erpnext-sync-log': {
      icon: 'mdi:clipboard-text-outline',
      order: 20,
      permission: 'eims:system:erpnext-sync-log'
    }
  };

  return ElegantVueRouter({
    layouts: {
      base: "src/layouts/base-layout/index.vue",
      blank: "src/layouts/blank-layout/index.vue",
    },
    routePathTransformer(routeName, routePath) {
      const key = routeName as RouteKey;

      if (key === "login") {
        const modules: UnionKey.LoginModule[] = [
          "pwd-login",
          "code-login",
          "register",
          "reset-pwd",
          "bind-wechat",
          "oauth-consent",
        ];

        const moduleReg = modules.join("|");

        return `/login/:module(${moduleReg})?`;
      }

      return legacySystemPaths[routeName] || routePath;
    },
    onRouteMetaGen(routeName) {
      const key = routeName as RouteKey;

      const constantRoutes: RouteKey[] = ["login", "403", "404", "500"];

      const meta: Partial<RouteMeta> = {
        title: key,
        i18nKey: `route.${key}` as App.I18n.I18nKey,
        ...systemRouteMeta[routeName]
      };

      if (constantRoutes.includes(key)) {
        meta.constant = true;
      }

      return meta;
    },
  });
}
