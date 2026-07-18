import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RolesModule } from '../roles/roles.module';
import { MessageCountsController } from './message-counts.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [AuthModule, MembersModule, RealtimeModule, RolesModule],
  controllers: [MessagesController, MessageCountsController],
  providers: [MessagesService],
})
export class MessagesModule {}
