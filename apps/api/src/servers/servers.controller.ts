import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createInviteInputSchema,
  createServerInputSchema,
  updateServerInputSchema,
} from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { ServersService } from './servers.service';

@ApiTags('servers')
@Controller('servers')
@UseGuards(AuthGuard)
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  create(
    @CurrentUser() user: AuthSession['user'],
    @Body(new ZodPipe(createServerInputSchema))
    body: ReturnType<typeof createServerInputSchema.parse>,
  ) {
    return this.serversService.createServer(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: AuthSession['user']) {
    return this.serversService.listMyServers(user.id);
  }

  @Get(':serverId')
  @UseGuards(ServerScopeGuard)
  getById(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.serversService.getServer(serverId, user.id);
  }

  @Patch(':serverId')
  @UseGuards(ServerScopeGuard)
  update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(updateServerInputSchema))
    body: ReturnType<typeof updateServerInputSchema.parse>,
  ) {
    return this.serversService.updateServer(serverId, user.id, body);
  }

  @Delete(':serverId')
  @UseGuards(ServerScopeGuard)
  remove(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.serversService.deleteServer(serverId, user.id);
  }

  @Post(':serverId/invites')
  @UseGuards(ServerScopeGuard)
  createInvite(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(createInviteInputSchema))
    body: ReturnType<typeof createInviteInputSchema.parse>,
  ) {
    return this.serversService.createInvite(serverId, user.id, body);
  }
}
