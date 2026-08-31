import { localStg } from '@/utils/storage';

/** Remove legacy token keys left by pre-cookie builds. */
export function clearAuthStorage() {
  localStg.remove('token');
  localStg.remove('refreshToken');
}
