import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { updateMemberInputSchema } from '@nookapp/protocol';
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

  @Patch(':userId')
  update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
    @Body(new ZodPipe(updateMemberInputSchema))
    body: ReturnType<typeof updateMemberInputSchema.parse>,
  ) {
    return this.membersService.updateMember(serverId, targetUserId, user.id, body);
  }

  @Delete(':userId')
  kick(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.membersService.kickMember(serverId, targetUserId, user.id);
  }
}
