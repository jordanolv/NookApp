import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { PluginsModule } from '../plugins/plugins.module';

@Module({
  imports: [AuthModule, forwardRef(() => PluginsModule)],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
