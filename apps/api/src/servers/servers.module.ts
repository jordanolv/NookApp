import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { RolesModule } from '../roles/roles.module';
import { InvitesController } from './invites.controller';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Module({
  imports: [AuthModule, MembersModule, RolesModule],
  controllers: [ServersController, InvitesController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
