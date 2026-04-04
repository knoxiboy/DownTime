import { Module, forwardRef } from '@nestjs/common';
import { ClaimController } from './claims.controller';
import { ClaimService } from './claims.service';
import { TriggerModule } from '../trigger/trigger.module';

@Module({
  imports: [forwardRef(() => TriggerModule)],
  controllers: [ClaimController],
  providers: [ClaimService],
  exports: [ClaimService],
})
export class ClaimsModule {}
