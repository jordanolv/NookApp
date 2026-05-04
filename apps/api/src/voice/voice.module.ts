import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [AuthModule, MembersModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
