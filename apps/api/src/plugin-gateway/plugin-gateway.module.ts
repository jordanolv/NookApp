import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PluginGatewayService } from './plugin-gateway.service';
import { PluginGatewayWs } from './plugin-gateway.gateway';
import { PluginRegistrationsController } from './plugin-registrations.controller';
import { PluginRegistrationsService } from './plugin-registrations.service';
import { ServerPluginsController } from './server-plugins.controller';
import { ServerPluginsService } from './server-plugins.service';

@Module({
  imports: [AuthModule, forwardRef(() => RealtimeModule)],
  providers: [
    PluginGatewayService,
    PluginRegistrationsService,
    ServerPluginsService,
    PluginGatewayWs,
  ],
  controllers: [PluginRegistrationsController, ServerPluginsController],
  exports: [PluginGatewayService],
})
export class PluginGatewayModule {}
