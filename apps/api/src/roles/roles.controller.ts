import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  createRoleInputSchema,
  PERMISSIONS,
  reorderRolesInputSchema,
  setMemberRolesInputSchema,
  updateRoleInputSchema,
  type CreateRoleInput,
  type ReorderRolesInput,
  type SetMemberRolesInput,
  type UpdateRoleInput,
} from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthSession } from '../auth/auth.types';
import { ZodPipe } from '../common/zod.pipe';
import { PermissionsGuard, RequirePermission } from './permissions.guard';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('servers/:serverId/roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  list(@Param('serverId') serverId: string) {
    return this.rolesService.listRoles(serverId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ManageRoles)
  create(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(createRoleInputSchema)) body: CreateRoleInput,
  ) {
    return this.rolesService.createRole(serverId, user.id, body);
  }

  @Put('order')
  @RequirePermission(PERMISSIONS.ManageRoles)
  reorder(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Body(new ZodPipe(reorderRolesInputSchema)) body: ReorderRolesInput,
  ) {
    return this.rolesService.reorderRoles(serverId, user.id, body.roleIds);
  }

  @Patch(':roleId')
  @RequirePermission(PERMISSIONS.ManageRoles)
  update(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
    @Body(new ZodPipe(updateRoleInputSchema)) body: UpdateRoleInput,
  ) {
    return this.rolesService.updateRole(serverId, roleId, user.id, body);
  }

  @Delete(':roleId')
  @RequirePermission(PERMISSIONS.ManageRoles)
  remove(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.deleteRole(serverId, roleId, user.id);
  }
}

@ApiTags('roles')
@Controller('servers/:serverId/members/:userId/roles')
@UseGuards(AuthGuard, PermissionsGuard)
export class MemberRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Put()
  @RequirePermission(PERMISSIONS.ManageRoles)
  set(
    @CurrentUser() user: AuthSession['user'],
    @Param('serverId') serverId: string,
    @Param('userId') targetUserId: string,
    @Body(new ZodPipe(setMemberRolesInputSchema)) body: SetMemberRolesInput,
  ) {
    return this.rolesService.setMemberRoles(serverId, targetUserId, user.id, body);
  }
}
