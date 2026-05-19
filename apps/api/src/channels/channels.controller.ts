import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { createChannelInputSchema, updateChannelInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { imageUploadOptions, StorageService } from '../common/storage';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { ChannelsService } from './channels.service';

interface UploadedChannelImageFile {
  filename: string;
}

@ApiTags('channels')
@Controller('servers/:serverId/channels')
@UseGuards(AuthGuard, ServerScopeGuard)
export class ChannelsController {
  constructor(
    private readonly channelsService: ChannelsService,
    private readonly storage: StorageService,
  ) {}

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

  @Post(':channelId/icon')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions({ scope: 'channel-icons' })))
  async setIcon(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @UploadedFile() file: UploadedChannelImageFile | undefined,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const previous = await this.channelsService.getChannel(serverId, channelId, user.id);
    const iconUrl = this.storage.urlFor('channel-icons', file.filename);
    const updated = await this.channelsService.updateChannel(serverId, channelId, user.id, {
      iconUrl,
    });
    if (previous.iconUrl && previous.iconUrl !== iconUrl) {
      void this.storage.deleteByUrl(previous.iconUrl);
    }
    return updated;
  }
  @Post(':channelId/banner')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions({ scope: 'channel-banners' })))
  async setBanner(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('channelId') channelId: string,
    @UploadedFile() file: UploadedChannelImageFile | undefined,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const previous = await this.channelsService.getChannel(serverId, channelId, user.id);
    const bannerUrl = this.storage.urlFor('channel-banners', file.filename);
    const updated = await this.channelsService.updateChannel(serverId, channelId, user.id, {
      bannerUrl,
    });
    if (previous.bannerUrl && previous.bannerUrl !== bannerUrl) {
      void this.storage.deleteByUrl(previous.bannerUrl);
    }
    return updated;
  }
}
