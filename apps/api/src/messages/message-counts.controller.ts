import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('servers/:serverId/message-counts')
@UseGuards(AuthGuard, ServerScopeGuard)
export class MessageCountsController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(@Param('serverId') serverId: string) {
    return this.messagesService.countByServer(serverId);
  }
}
