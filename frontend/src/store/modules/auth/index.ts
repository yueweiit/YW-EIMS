import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { useLoading } from '@sa/hooks';
import { fetchDingTalkLoginToken, fetchGetUserInfo, fetchLogin, fetchLogout } from '@/service/api';
import { useRouterPush } from '@/hooks/common/router';
import { localStg } from '@/utils/storage';
import { SetupStoreId } from '@/enum';
import { $t } from '@/locales';
import { useRouteStore } from '../route';
import { useTabStore } from '../tab';
import { clearAuthStorage } from './shared';

let resetPromise: Promise<void> | null = null;

export const useAuthStore = defineStore(SetupStoreId.Auth, () => {
  const route = useRoute();
  const authStore = useAuthStore();
  const routeStore = useRouteStore();
  const tabStore = useTabStore();
  const { toLogin, redirectFromLogin } = useRouterPush(false);
  const { loading: loginLoading, startLoading, endLoading } = useLoading();

  const token = ref('');
  let initialized = false;
  let initializing: Promise<void> | null = null;

  const userInfo: Api.Auth.UserInfo = reactive({
    userId: '',
    userName: '',
    roles: [],
    buttons: [],
    permissions: []
  });

  /** is super role in static route */
  const isStaticSuper = computed(() => {
    const { VITE_AUTH_ROUTE_MODE, VITE_STATIC_SUPER_ROLE } = import.meta.env;

    return VITE_AUTH_ROUTE_MODE === 'static' && userInfo.roles.includes(VITE_STATIC_SUPER_ROLE);
  });

  /** Is login */
  const isLogin = computed(() => Boolean(token.value));

  /** Reset auth store */
  async function resetStore() {
    if (resetPromise) {
      return resetPromise;
    }

    resetPromise = (async () => {
      recordUserId();

      // Wait for the server to revoke the cookie session before navigating to
      // the login route. Otherwise its route guard can call getUserInfo with
      // the old cookie and race with logout.
      if (token.value || userInfo.userId) {
        try {
          await fetchLogout();
        } catch {
          // Local cleanup and redirect must still happen when the server is unavailable.
        }
      }

      clearAuthStorage();
      initialized = false;

      authStore.$reset();

      if (!route.meta.constant) {
        await toLogin();
      }

      tabStore.cacheTabs();
      await routeStore.resetStore();
    })();

    try {
      await resetPromise;
    } finally {
      resetPromise = null;
    }
  }

  /** Record the user ID of the previous login session Used to compare with the current user ID on next login */
  function recordUserId() {
    if (!userInfo.userId) {
      return;
    }

    // Store current user ID locally for next login comparison
    localStg.set('lastLoginUserId', userInfo.userId);
  }

  /**
   * Check if current login user is different from previous login user If different, clear all tabs
   *
   * @returns {boolean} Whether to clear all tabs
   */
  function checkTabClear(): boolean {
    if (!userInfo.userId) {
      return false;
    }

    const lastLoginUserId = localStg.get('lastLoginUserId');

    // Clear all tabs if current user is different from previous user
    if (!lastLoginUserId || lastLoginUserId !== userInfo.userId) {
      localStg.remove('globalTabs');
      tabStore.clearTabs();

      localStg.remove('lastLoginUserId');
      return true;
    }

    localStg.remove('lastLoginUserId');
    return false;
  }

  /**
   * Login
   *
   * @param userName User name
   * @param password Password
   * @param [redirect=true] Whether to redirect after login. Default is `true`
   */
  async function login(userName: string, password: string, redirect = true) {
    startLoading();

    const { data: loginSession, error } = await fetchLogin(userName, password);

    if (!error && loginSession?.authenticated) {
      const pass = await loginBySession();

      if (pass) {
        // Check if the tab needs to be cleared
        const isClear = checkTabClear();
        let needRedirect = redirect;

        if (isClear) {
          // If the tab needs to be cleared,it means we don't need to redirect.
          needRedirect = false;
        }
        await redirectFromLogin(needRedirect);

        window.$notification?.success({
          title: $t('page.login.common.loginSuccess'),
          content: $t('page.login.common.welcomeBack', { userName: userInfo.userName }),
          duration: 4500
        });
      }
    } else {
      resetStore();
    }

    endLoading();
  }

  async function loginWithDingTalkTicket(ticket: string, redirect = true) {
    startLoading();

    const { data: loginSession, error } = await fetchDingTalkLoginToken(ticket);
    if (!error && loginSession?.authenticated) {
      const pass = await loginBySession();

      if (pass) {
        const isClear = checkTabClear();
        await redirectFromLogin(redirect && !isClear);

        window.$notification?.success({
          title: $t('page.login.common.loginSuccess'),
          content: $t('page.login.common.welcomeBack', { userName: userInfo.userName }),
          duration: 4500
        });
      }
    }

    endLoading();
  }

  async function loginBySession() {
    clearAuthStorage();
    const pass = await getUserInfo();

    if (pass) {
      token.value = 'cookie';
      initialized = true;

      return true;
    }

    return false;
  }

  async function getUserInfo() {
    const { data: info, error } = await fetchGetUserInfo();

    if (!error) {
      // update store
      Object.assign(userInfo, info);

      return true;
    }

    return false;
  }

  async function initUserInfo() {
    if (initialized) return;
    if (initializing) return initializing;

    initializing = (async () => {
      // Remove tokens left by older builds; current auth is cookie-only.
      clearAuthStorage();
      const pass = await getUserInfo();
      if (pass) {
        token.value = 'cookie';
        initialized = true;
      } else {
        token.value = '';
      }
    })();

    try {
      await initializing;
    } finally {
      initializing = null;
    }
  }

  return {
    token,
    userInfo,
    isStaticSuper,
    isLogin,
    loginLoading,
    resetStore,
    login,
    loginWithDingTalkTicket,
    initUserInfo
  };
});
