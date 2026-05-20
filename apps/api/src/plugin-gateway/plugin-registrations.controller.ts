import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createPluginRegistrationInputSchema,
  type CreatePluginRegistrationInput,
} from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthSession } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodPipe } from '../common/zod.pipe';
import { PluginRegistrationsService } from './plugin-registrations.service';

@ApiTags('plugin-registrations')
@Controller('plugin-registrations')
@UseGuards(AuthGuard)
export class PluginRegistrationsController {
  constructor(private readonly service: PluginRegistrationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthSession['user'],
    @Body(new ZodPipe(createPluginRegistrationInputSchema))
    body: CreatePluginRegistrationInput,
  ) {
    return this.service.create(user.id, body);
  }

  @Get()
  listMine(@CurrentUser() user: AuthSession['user']) {
    return this.service.listByOwner(user.id);
  }
}
