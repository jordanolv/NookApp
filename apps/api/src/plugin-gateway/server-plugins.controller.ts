import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthSession } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { ServerPluginsService } from './server-plugins.service';

@ApiTags('server-plugins')
@Controller('servers/:serverId/plugins')
@UseGuards(AuthGuard, ServerScopeGuard)
export class ServerPluginsController {
  constructor(private readonly service: ServerPluginsService) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.service.listForServer(serverId, user.id);
  }

  @Post(':pluginId/install')
  async install(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('pluginId') pluginId: string,
  ) {
    await this.service.install(serverId, pluginId, user.id);
    return { ok: true };
  }

  @Delete(':pluginId')
  async uninstall(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('pluginId') pluginId: string,
  ) {
    await this.service.uninstall(serverId, pluginId, user.id);
    return { ok: true };
  }
}
