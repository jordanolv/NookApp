import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './common/http-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { MapsModule } from './maps/maps.module';
import { MembersModule } from './members/members.module';
import { MessagesModule } from './messages/messages.module';
import { DmsModule } from './dms/dms.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ServersModule } from './servers/servers.module';
import { UsersModule } from './users/users.module';
import { VoiceModule } from './voice/voice.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { CategoriesModule } from './categories/categories.module';
import { RolesModule } from './roles/roles.module';
import { StorageModule } from './common/storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    StorageModule,
    DatabaseModule,
    MailerModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ServersModule,
    ChannelsModule,
    MembersModule,
    MessagesModule,
    DmsModule,
    MapsModule,
    RealtimeModule,
    VoiceModule,
    CollaborationModule,
    CategoriesModule,
    RolesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: HttpThrottlerGuard }],
})
export class AppModule {}
