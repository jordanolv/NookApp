import { toPlainObject } from '~/utils/plain-object';

// Sur /__nuxt_error, le renderer reconstruit l'erreur depuis la query h3 :
// un objet sans prototype. Sans normalisation, la serialisation du payload
// echoue en 500 et le client recoit du JSON brut au lieu de error.vue.
export default defineNuxtPlugin((nuxtApp) => {
  if (nuxtApp.payload.error) {
    nuxtApp.payload.error = toPlainObject(nuxtApp.payload.error);
  }
});
