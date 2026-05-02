import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { VoiceService } from './voice.service';

@ApiTags('voice')
@Controller('servers/:serverId/channels/:channelId/livekit-token')
@UseGuards(AuthGuard, ServerScopeGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Get()
  getToken(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.voiceService.getToken(serverId, channelId, user.id);
  }
}
