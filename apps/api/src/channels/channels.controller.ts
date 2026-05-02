import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createChannelInputSchema, updateChannelInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@Controller('servers/:serverId/channels')
@UseGuards(AuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.channelsService.listChannels(serverId, user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(createChannelInputSchema))
    body: ReturnType<typeof createChannelInputSchema.parse>,
  ) {
    return this.channelsService.createChannel(serverId, user.id, body);
  }

  @Patch(':channelId')
  update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @Body(new ZodPipe(updateChannelInputSchema))
    body: ReturnType<typeof updateChannelInputSchema.parse>,
  ) {
    return this.channelsService.updateChannel(serverId, channelId, user.id, body);
  }

  @Delete(':channelId')
  remove(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
  ) {
    return this.channelsService.deleteChannel(serverId, channelId, user.id);
  }
}
