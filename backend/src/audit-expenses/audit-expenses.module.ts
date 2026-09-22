import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditExpense } from './entities/audit-expense.entity';
import { AuditExpensesService } from './audit-expenses.service';
import { AuditExpensesController } from './audit-expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditExpense])],
  controllers: [AuditExpensesController],
  providers: [AuditExpensesService],
  exports: [AuditExpensesService],
})
export class AuditExpensesModule {}
