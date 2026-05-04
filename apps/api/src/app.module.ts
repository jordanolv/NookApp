import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ChannelsModule } from './channels/channels.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { MapsModule } from './maps/maps.module';
import { MembersModule } from './members/members.module';
import { MessagesModule } from './messages/messages.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ServersModule } from './servers/servers.module';
import { UsersModule } from './users/users.module';
import { VoiceModule } from './voice/voice.module';
import { PluginsModule } from './plugins/plugins.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')],
    }),
    DatabaseModule,
    MailerModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ServersModule,
    ChannelsModule,
    MembersModule,
    MessagesModule,
    MapsModule,
    RealtimeModule,
    VoiceModule,
    PluginsModule,
  ],
})
export class AppModule {}
