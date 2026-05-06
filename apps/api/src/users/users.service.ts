import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { user, type Database } from '@nookapp/db';
import type { UiLayout, UiLayoutPatchInput } from '@nookapp/protocol';
import { DB } from '../database/database.module';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async getUiLayout(userId: string): Promise<UiLayout> {
    const [row] = await this.db
      .select({ uiLayout: user.uiLayout })
      .from(user)
      .where(eq(user.id, userId));
    return (row?.uiLayout as UiLayout | undefined) ?? {};
  }

  async patchUiLayout(userId: string, input: UiLayoutPatchInput): Promise<UiLayout> {
    const current = await this.getUiLayout(userId);
    const next: UiLayout = { ...current };
    for (const [key, value] of Object.entries(input.entries)) {
      if (value === null) {
        delete next[key];
      } else {
        next[key] = { ...(next[key] ?? {}), ...value };
      }
    }
    await this.db
      .update(user)
      .set({ uiLayout: next, updatedAt: new Date() })
      .where(eq(user.id, userId));
    return next;
  }
}
