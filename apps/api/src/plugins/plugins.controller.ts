import { Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { PluginsService } from './plugins.service';

@ApiTags('plugins')
@UseGuards(AuthGuard)
@Controller()
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get('plugins')
  listAvailable() {
    return this.pluginsService.listAvailable();
  }

  @Get('servers/:serverId/plugins')
  @UseGuards(ServerScopeGuard)
  listForServer(@Param('serverId') serverId: string) {
    return this.pluginsService.listForServer(serverId);
  }

  @Post('servers/:serverId/plugins/:pluginId/enable')
  @UseGuards(ServerScopeGuard)
  async enable(@Param('serverId') serverId: string, @Param('pluginId') pluginId: string) {
    try {
      await this.pluginsService.enable(serverId, pluginId);
      return { ok: true };
    } catch {
      throw new NotFoundException(`Plugin ${pluginId} not found`);
    }
  }

  @Delete('servers/:serverId/plugins/:pluginId')
  @UseGuards(ServerScopeGuard)
  async disable(@Param('serverId') serverId: string, @Param('pluginId') pluginId: string) {
    await this.pluginsService.disable(serverId, pluginId);
    return { ok: true };
  }
}
