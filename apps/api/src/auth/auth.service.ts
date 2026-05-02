import { Inject, Injectable } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { AUTH, type AuthInstance, type AuthSession } from './auth.types';

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH) private readonly auth: AuthInstance) {}

  get instance(): AuthInstance {
    return this.auth;
  }

  async getSession(headers: IncomingHttpHeaders | Headers): Promise<AuthSession | null> {
    const h = headers instanceof Headers ? headers : toFetchHeaders(headers);
    const result = await this.auth.api.getSession({ headers: h });
    if (!result) return null;
    return result as unknown as AuthSession;
  }
}

function toFetchHeaders(src: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(src)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (typeof value === 'string') {
      headers.set(key, value);
    }
  }
  return headers;
}
