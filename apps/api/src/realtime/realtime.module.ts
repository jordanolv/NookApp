import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { PluginsModule } from '../plugins/plugins.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [AuthModule, forwardRef(() => PluginsModule), MembersModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
