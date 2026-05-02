import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthSession['user']) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.image ?? null,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
