/** The existing API error envelope carries this stable reason in msg. */
export function isSharedAccountConfirmation(error: {
  response?: { status: number; data?: { msg?: unknown } };
} | null | undefined) {
  return error?.response?.status === 409 &&
    error.response.data?.msg === 'OAUTH2_SHARED_ACCOUNT_CONFIRMATION_REQUIRED';
}

/** Retry only this explicit, non-writing confirmation response; never retry other failures. */
export async function saveWithSharedAccountConfirmation<T extends {
  error: Parameters<typeof isSharedAccountConfirmation>[0];
}>(save: (confirmed: boolean) => Promise<T>, confirm: () => Promise<boolean>): Promise<T | null> {
  const result = await save(false);
  if (!isSharedAccountConfirmation(result.error)) return result;
  if (!(await confirm())) return null;
  return save(true);
}
