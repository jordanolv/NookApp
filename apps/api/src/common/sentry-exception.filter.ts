import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

/**
 * Remonte a Sentry les erreurs serveur, puis delegue le rendu de la reponse au
 * filtre par defaut de Nest.
 */
@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost): void {
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Les 4xx sont des erreurs d'appelant attendues (validation, droits
    // insuffisants) : les remonter noierait les vraies anomalies serveur.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
