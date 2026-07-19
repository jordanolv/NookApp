import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DmsController } from './dms.controller';
import { DmsService } from './dms.service';

@Module({
  imports: [AuthModule, RealtimeModule],
  controllers: [DmsController],
  providers: [DmsService],
})
export class DmsModule {}
