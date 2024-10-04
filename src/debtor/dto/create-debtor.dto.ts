import { createZodDto } from '@anatine/zod-nestjs';
import { LoanSchema } from 'src/loan/entities/loan.entity';
import { z } from 'zod';
import { DebtorSchema } from '../entities/debtor.entity';

export const CreateDebtorSchema = DebtorSchema.omit({ id: true });

export class CreateDebtorDto extends createZodDto(CreateDebtorSchema) {}

export const CreateNewDebtorSchema = z.object({
  debtor: CreateDebtorSchema,
  loan: LoanSchema.omit({
    id: true,
    debtorId: true,
  }),
});

export class CreateNewDebtorDto extends createZodDto(CreateNewDebtorSchema) {}

export const CreateExistingDebtorSchema = CreateNewDebtorSchema.extend({
  paidAmount: z
    .number()
    .min(0, 'Paid amount must be greater than or equal to 0'),
});

export class CreateExistingDebtorDto extends createZodDto(
  CreateExistingDebtorSchema,
) {}
