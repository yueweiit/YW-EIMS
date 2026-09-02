import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    const hasCode = (code: string) =>
      authStore.userInfo.buttons.includes(code) ||
      authStore.userInfo.permissions.includes('*') ||
      authStore.userInfo.permissions.includes(code);

    if (typeof codes === 'string') return hasCode(codes);

    return codes.some(code => hasCode(code));
  }

  return {
    hasAuth
  };
}
