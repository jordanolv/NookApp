import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ServersService } from './servers.service';

@ApiTags('invites')
@Controller('invites')
@UseGuards(AuthGuard)
export class InvitesController {
  constructor(private readonly serversService: ServersService) {}

  @Post(':code/join')
  join(@CurrentUser() user: AuthSession['user'], @Param('code') code: string) {
    return this.serversService.joinViaInvite(code, user.id);
  }
}
