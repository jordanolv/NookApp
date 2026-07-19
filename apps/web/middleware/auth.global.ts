export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, ready } = useAuth();

  if (to.path.startsWith('/app')) {
    if (ready.value && !isAuthenticated.value) {
      return navigateTo('/auth/login');
    }
    return;
  }

  if (to.path.startsWith('/auth')) {
    const passthrough = ['/auth/reset-password', '/auth/verify'];
    if (passthrough.includes(to.path)) return;
    if (ready.value && isAuthenticated.value) {
      return navigateTo('/app');
    }
  }
});
