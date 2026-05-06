import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { CurrentMember } from './current-member.decorator';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { ServerScopeGuard } from './server-scope.guard';

export { ServerScopeGuard, CurrentMember };

@Module({
  imports: [AuthModule, RolesModule],
  controllers: [MembersController],
  providers: [MembersService, ServerScopeGuard],
  exports: [MembersService, ServerScopeGuard],
})
export class MembersModule {}
