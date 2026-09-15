import { Controller, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('servers/:serverId')
@UseGuards(AuthGuard, ServerScopeGuard)
export class UnreadController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('unread')
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.messagesService.unreadByServer(serverId, user.id);
  }

  @Put('channels/:channelId/read')
  @HttpCode(204)
  markRead(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.messagesService.markChannelRead(serverId, channelId, user.id);
  }
}
