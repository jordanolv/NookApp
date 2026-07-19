export function useResolveUrl() {
  const { apiBase } = useRuntimeConfig().public;
  const apiOrigin = new URL(apiBase as string).origin;

  function resolveUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('/') ? `${apiOrigin}${url}` : url;
  }

  return { apiOrigin, resolveUrl };
}
