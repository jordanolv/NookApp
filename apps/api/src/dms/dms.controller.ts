import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { createDirectMessageInputSchema, openDmInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DmsService } from './dms.service';

@ApiTags('dms')
@Controller('dms')
@UseGuards(AuthGuard)
export class DmsController {
  constructor(
    private readonly dms: DmsService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user']) {
    return this.dms.listConversations(user.id);
  }

  @Get('candidates')
  candidates(@CurrentUser() user: AuthSession['user']) {
    return this.dms.listCandidates(user.id);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get('lookup')
  lookup(@CurrentUser() user: AuthSession['user'], @Query('username') username: string) {
    return this.dms.lookupByUsername(username ?? '', user.id);
  }

  @Post()
  open(
    @CurrentUser() user: AuthSession['user'],
    @Body(new ZodPipe(openDmInputSchema)) body: ReturnType<typeof openDmInputSchema.parse>,
  ) {
    return this.dms.openConversation(user.id, body.recipientId);
  }

  @Get(':conversationId/messages')
  messages(
    @CurrentUser() user: AuthSession['user'],
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.dms.listMessages(conversationId, user.id, {
      limit: limit ? Number(limit) : undefined,
      before,
    });
  }

  @Post(':conversationId/messages')
  async send(
    @CurrentUser() user: AuthSession['user'],
    @Param('conversationId') conversationId: string,
    @Body(new ZodPipe(createDirectMessageInputSchema))
    body: ReturnType<typeof createDirectMessageInputSchema.parse>,
  ) {
    const { message, participantIds } = await this.dms.createMessage(conversationId, user.id, body);
    for (const pid of participantIds) this.gateway.emitToUser(pid, 'dm:message', message);
    return message;
  }

  @Post(':conversationId/read')
  read(@CurrentUser() user: AuthSession['user'], @Param('conversationId') conversationId: string) {
    return this.dms.markRead(conversationId, user.id);
  }
}
