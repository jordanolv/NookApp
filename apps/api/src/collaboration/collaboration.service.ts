import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  Server,
  type onAuthenticatePayload,
  type onLoadDocumentPayload,
  type onChangePayload,
} from '@hocuspocus/server';
import { and, eq } from 'drizzle-orm';
import { map as mapTable, member, type Database } from '@nookapp/db';
import { mapDataSchema, DEFAULT_MAP, type MapItem } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { AUTH, type AuthInstance, type AuthSession } from '../auth/auth.types';
import crypto from 'node:crypto';

const SAVE_DEBOUNCE_MS = 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min

@Injectable()
export class CollaborationService implements OnApplicationShutdown {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly secret: string;
  private readonly saveTimers = new Map<string, NodeJS.Timeout>();
  readonly server: Server;

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(AUTH) private readonly auth: AuthInstance,
  ) {
    this.secret = process.env.JWT_SECRET ?? 'dev-collab-secret';

    this.server = new Server({
      port: Number(process.env.COLLAB_PORT ?? 1234),
      onAuthenticate: (data) => this.onAuthenticate(data),
      onLoadDocument: (data) => this.onLoadDocument(data),
      onChange: (data) => this.onChange(data),
    });
  }

  async listen() {
    await this.server.listen();
    this.logger.log(`Hocuspocus listening on port ${process.env.COLLAB_PORT ?? 1234}`);
  }

  async onApplicationShutdown() {
    for (const timer of this.saveTimers.values()) clearTimeout(timer);
    await this.server.destroy();
  }

  signToken(userId: string): string {
    const payload = JSON.stringify({ userId, exp: Date.now() + TOKEN_TTL_MS });
    const b64 = Buffer.from(payload).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url');
    return `${b64}.${sig}`;
  }

  private verifyToken(token: string): { userId: string } {
    const dot = token.lastIndexOf('.');
    if (dot === -1) throw new Error('malformed token');
    const b64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', this.secret).update(b64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new Error('invalid signature');
    }
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString()) as {
      userId: string;
      exp: number;
    };
    if (parsed.exp < Date.now()) throw new Error('token expired');
    return { userId: parsed.userId };
  }

  private async onAuthenticate({
    documentName,
    token,
  }: onAuthenticatePayload): Promise<AuthSession['user']> {
    const { userId } = this.verifyToken(token);

    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, documentName), eq(member.userId, userId)))
      .limit(1);

    if (!m) throw new Error('not a member of this server');

    return { id: userId } as AuthSession['user'];
  }

  private async onLoadDocument({ documentName, document }: onLoadDocumentPayload) {
    const tilesArray = document.getArray<number[]>('tiles');
    if (tilesArray.length > 0) return;

    const [row] = await this.db
      .select()
      .from(mapTable)
      .where(eq(mapTable.serverId, documentName))
      .limit(1);

    const parsed = row
      ? mapDataSchema.safeParse(row.data)
      : { success: true as const, data: DEFAULT_MAP };

    if (!parsed.success) return;

    const itemsArray = document.getArray<MapItem>('items');
    document.transact(() => {
      tilesArray.insert(0, parsed.data.tiles);
      if (parsed.data.items.length) itemsArray.insert(0, parsed.data.items);
    });
  }

  private async onChange({ documentName, document }: onChangePayload) {
    const existing = this.saveTimers.get(documentName);
    if (existing) clearTimeout(existing);

    this.saveTimers.set(
      documentName,
      setTimeout(() => {
        this.saveTimers.delete(documentName);
        void this.persistDoc(documentName, document);
      }, SAVE_DEBOUNCE_MS),
    );
  }

  private async persistDoc(serverId: string, document: onChangePayload['document']) {
    const tiles = document.getArray<number[]>('tiles').toArray();
    const items = document.getArray<MapItem>('items').toArray();

    const parsed = mapDataSchema.safeParse({ tiles, items });
    if (!parsed.success) {
      this.logger.warn(`invalid map data for ${serverId}, skipping persist`);
      return;
    }

    await this.db
      .insert(mapTable)
      .values({ serverId, data: parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: mapTable.serverId,
        set: { data: parsed.data, updatedAt: new Date() },
      });
  }
}
