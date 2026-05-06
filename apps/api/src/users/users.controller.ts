import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uiLayoutPatchInputSchema, type UiLayoutPatchInput } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get('me/ui-layout')
  @UseGuards(AuthGuard)
  getUiLayout(@CurrentUser() user: AuthSession['user']) {
    return this.usersService.getUiLayout(user.id);
  }

  @Patch('me/ui-layout')
  @UseGuards(AuthGuard)
  patchUiLayout(
    @CurrentUser() user: AuthSession['user'],
    @Body(new ZodPipe(uiLayoutPatchInputSchema)) body: UiLayoutPatchInput,
  ) {
    return this.usersService.patchUiLayout(user.id, body);
  }
}
