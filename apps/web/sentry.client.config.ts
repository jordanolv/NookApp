import * as Sentry from '@sentry/nuxt';

const config = useRuntimeConfig();
const dsn = String(config.public.sentryDsn ?? '').trim();

// Sans DSN le SDK reste inerte : aucun appel reseau, rien a configurer en
// developpement ni pour un build de CI.
if (dsn) {
  Sentry.init({
    dsn,
    environment: String(config.public.sentryEnvironment ?? 'development'),
    // Renseigne par la CD avec le SHA du commit deploye.
    release: String(config.public.sentryRelease ?? '') || undefined,
    tracesSampleRate: 0.1,
    // Le monde 2D est un canvas : le rejeu de session n'a rien a restituer et
    // couterait cher en quota pour un resultat vide.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
