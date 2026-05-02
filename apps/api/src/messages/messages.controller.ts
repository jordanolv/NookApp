import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createMessageInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('servers/:serverId/channels/:channelId/messages')
@UseGuards(AuthGuard, ServerScopeGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.messagesService.listMessages(serverId, channelId, user.id, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Post()
  async create(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Body(new ZodPipe(createMessageInputSchema))
    body: ReturnType<typeof createMessageInputSchema.parse>,
  ) {
    const msg = await this.messagesService.createMessage(serverId, channelId, user.id, body);
    this.gateway.emitToServer(serverId, 'message:sent', msg);
    return msg;
  }
}
