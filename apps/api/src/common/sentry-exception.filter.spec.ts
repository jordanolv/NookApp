import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { SentryExceptionFilter } from './sentry-exception.filter';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

describe('SentryExceptionFilter', () => {
  let filter: SentryExceptionFilter;
  let host: ArgumentsHost;
  let superCatch: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Le rendu de la reponse appartient au filtre par defaut de Nest : on
    // verifie qu'il est appele, pas ce qu'il ecrit.
    superCatch = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => {});
    filter = new SentryExceptionFilter();
    host = {} as ArgumentsHost;
  });

  afterEach(() => superCatch.mockRestore());

  it('reports a 500 HttpException to Sentry', () => {
    const exception = new InternalServerErrorException('boom');

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it('reports a non-HttpException as a server error', () => {
    const exception = new TypeError('undefined is not a function');

    filter.catch(exception, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(exception);
  });

  it('does not report a 400', () => {
    filter.catch(new BadRequestException('invalid payload'), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not report a 403', () => {
    filter.catch(new ForbiddenException(), host);

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('always delegates the response to the default filter', () => {
    filter.catch(new BadRequestException(), host);
    filter.catch(new InternalServerErrorException(), host);

    expect(superCatch).toHaveBeenCalledTimes(2);
  });
});
