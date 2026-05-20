import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { PluginGatewayService } from './plugin-gateway.service';
import { PluginGatewayWs } from './plugin-gateway.gateway';
import { PluginRegistrationsController } from './plugin-registrations.controller';
import { PluginRegistrationsService } from './plugin-registrations.service';

@Module({
  imports: [AuthModule, forwardRef(() => RealtimeModule)],
  providers: [PluginGatewayService, PluginRegistrationsService, PluginGatewayWs],
  controllers: [PluginRegistrationsController],
  exports: [PluginGatewayService],
})
export class PluginGatewayModule {}
