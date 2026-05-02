export default defineNuxtRouteMiddleware((to) => {
  if (!to.path.startsWith('/app')) return;
  const { isAuthenticated, ready } = useAuth();
  if (ready.value && !isAuthenticated.value) {
    return navigateTo('/auth/login');
  }
});
