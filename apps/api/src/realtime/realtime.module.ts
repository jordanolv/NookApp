import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { PluginGatewayModule } from '../plugin-gateway/plugin-gateway.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [AuthModule, forwardRef(() => PluginGatewayModule), MembersModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
