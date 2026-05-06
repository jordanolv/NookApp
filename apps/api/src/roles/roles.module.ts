import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CurrentAuthz } from './current-authz.decorator';
import { PermissionsGuard } from './permissions.guard';
import { MemberRolesController, RolesController } from './roles.controller';
import { RolesService } from './roles.service';

export { CurrentAuthz, PermissionsGuard, RolesService };

@Module({
  imports: [AuthModule],
  controllers: [RolesController, MemberRolesController],
  providers: [RolesService, PermissionsGuard],
  exports: [RolesService, PermissionsGuard],
})
export class RolesModule {}
