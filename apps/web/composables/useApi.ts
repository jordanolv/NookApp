export function useApi() {
  const { apiBase } = useRuntimeConfig().public;

  function get<T>(path: string, opts?: Parameters<typeof $fetch>[1]) {
    return $fetch<T>(`${apiBase}${path}`, { credentials: 'include', ...opts });
  }

  function post<T>(
    path: string,
    body: Record<string, unknown>,
    opts?: Parameters<typeof $fetch>[1],
  ) {
    return $fetch<T>(`${apiBase}${path}`, {
      method: 'POST',
      body,
      credentials: 'include',
      ...opts,
    });
  }

  function patch<T>(
    path: string,
    body: Record<string, unknown>,
    opts?: Parameters<typeof $fetch>[1],
  ) {
    return $fetch<T>(`${apiBase}${path}`, {
      method: 'PATCH',
      body,
      credentials: 'include',
      ...opts,
    });
  }

  function del(path: string, opts?: Parameters<typeof $fetch>[1]) {
    return $fetch(`${apiBase}${path}`, { method: 'DELETE', credentials: 'include', ...opts });
  }

  return { get, post, patch, del };
}
