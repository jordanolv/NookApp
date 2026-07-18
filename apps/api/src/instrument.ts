/**
 * Initialisation Sentry.
 *
 * Doit etre importe en tout premier dans main.ts : le SDK instrumente les
 * modules Node (http, postgres) au chargement, donc toute importation
 * anterieure echapperait a la capture.
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();

// Sans DSN le SDK reste inerte : pas d'appel reseau, aucune configuration
// requise en developpement ni en CI.
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    // Renseigne par la CD avec le SHA du commit deploye : relie une exception
    // a la version exacte qui l'a produite.
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}

export const sentryEnabled = Boolean(dsn);
