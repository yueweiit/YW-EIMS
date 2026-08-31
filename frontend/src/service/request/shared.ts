import { useAuthStore } from '@/store/modules/auth';
import { fetchRefreshToken } from '../api';
import type { RequestInstanceState } from './type';

export function getAuthorization() {
  return null;
}

/** Read only the non-sensitive CSRF token cookie; auth cookies remain HttpOnly. */
export function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const item = document.cookie
    .split('; ')
    .find(value => value.startsWith('eims_csrf='));
  if (!item) return null;
  try {
    return decodeURIComponent(item.substring('eims_csrf='.length));
  } catch {
    return null;
  }
}

/** refresh token */
async function handleRefreshToken() {
  const { resetStore } = useAuthStore();

  const { error } = await fetchRefreshToken();
  if (!error) {
    return true;
  }

  resetStore();

  return false;
}

export async function handleExpiredRequest(state: RequestInstanceState) {
  if (!state.refreshTokenPromise) {
    state.refreshTokenPromise = handleRefreshToken();
  }

  const success = await state.refreshTokenPromise;

  setTimeout(() => {
    state.refreshTokenPromise = null;
  }, 1000);

  return success;
}

export function showErrorMsg(state: RequestInstanceState, message: string) {
  if (!state.errMsgStack?.length) {
    state.errMsgStack = [];
  }

  const isExist = state.errMsgStack.includes(message);

  if (!isExist) {
    state.errMsgStack.push(message);

    window.$message?.error(message, {
      onLeave: () => {
        state.errMsgStack = state.errMsgStack.filter(msg => msg !== message);

        setTimeout(() => {
          state.errMsgStack = [];
        }, 5000);
      }
    });
  }
}
