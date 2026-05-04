import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { CollaborationService } from './collaboration.service';

@ApiTags('collaboration')
@Controller('collaboration')
@UseGuards(AuthGuard)
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('token')
  getToken(@CurrentUser() user: AuthSession['user']) {
    return { token: this.collaborationService.signToken(user.id) };
  }
}
