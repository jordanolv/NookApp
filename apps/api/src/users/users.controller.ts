import { Body, Controller, Delete, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  deleteAccountInputSchema,
  uiLayoutPatchInputSchema,
  type DeleteAccountInput,
  type UiLayoutPatchInput,
} from '@nookapp/protocol';
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

  @Get('me/owned-servers')
  @UseGuards(AuthGuard)
  ownedServers(@CurrentUser() user: AuthSession['user']) {
    return this.usersService.listOwnedServers(user.id);
  }

  @Get('me/export')
  @UseGuards(AuthGuard)
  exportData(@CurrentUser() user: AuthSession['user']) {
    return this.usersService.exportData(user.id);
  }

  @Delete('me')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  deleteMe(
    @CurrentUser() user: AuthSession['user'],
    @Body(new ZodPipe(deleteAccountInputSchema)) body: DeleteAccountInput,
  ) {
    return this.usersService.deleteAccount(user.id, body);
  }
}
