import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateMapInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { MapsService } from './maps.service';

@ApiTags('maps')
@Controller('servers/:serverId/map')
@UseGuards(AuthGuard, ServerScopeGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get()
  get(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.mapsService.getMap(serverId, user.id);
  }

  @Put()
  save(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(updateMapInputSchema))
    body: ReturnType<typeof updateMapInputSchema.parse>,
  ) {
    return this.mapsService.saveMap(serverId, user.id, body.data);
  }
}
