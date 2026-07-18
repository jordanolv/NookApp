import { Body, Controller, Delete, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { banMemberInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { ServerScopeGuard } from './server-scope.guard';
import { MembersService } from './members.service';

@ApiTags('members')
@Controller('servers/:serverId/members')
@UseGuards(AuthGuard, ServerScopeGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  list(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.membersService.listMembers(serverId, user.id);
  }

  @Get('me')
  me(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.membersService.getMember(serverId, user.id);
  }

  @Delete(':userId')
  kick(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.membersService.kickMember(serverId, targetUserId, user.id);
  }

  @Get('bans/list')
  listBans(@CurrentUser() user: AuthSession['user'], @Param('serverId') serverId: string) {
    return this.membersService.listBans(serverId, user.id);
  }

  @Post(':userId/ban')
  @HttpCode(204)
  async ban(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
    @Body(new ZodPipe(banMemberInputSchema))
    body: ReturnType<typeof banMemberInputSchema.parse>,
  ) {
    await this.membersService.banMember(serverId, targetUserId, user.id, body);
  }

  @Delete('bans/:userId')
  @HttpCode(204)
  async unban(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
  ) {
    await this.membersService.unbanMember(serverId, targetUserId, user.id);
  }
}
