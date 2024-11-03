import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseRepository } from '../firebase/firebase.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { Loan, LoanSchema } from './entities/loan.entity';
import { UpdateLoanDto } from './dto/update-loan.dto';

export const loanCollection = 'loan';

// TODO: handle update via nest admin
@Injectable()
export class LoanService {
  private readonly logger = new Logger(LoanService.name);

  constructor(private firebaseRepository: FirebaseRepository) {}

  async create(createLoanDto: CreateLoanDto): Promise<Loan> {
    try {
      const docRef = await this.firebaseRepository.db
        .collection(loanCollection)
        .add({
          ...createLoanDto,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      const data = (await docRef.get()).data();
      return { id: docRef.id, ...data } as Loan;
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message, {
        cause: err?.message,
      });
    }
  }

  async findById(
    id: string,
  ): Promise<
    FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>
  > {
    const docRef = this.firebaseRepository.db
      .collection(loanCollection)
      .doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      this.logger.error(`Loan with id ${id} does not exist`);
      throw new NotFoundException(`Loan with id ${id} does not exist`);
    }
    return docRef;
  }

  async findByDebtorId(debtorId: string): Promise<Loan[]> {
    const loanRef = await this.firebaseRepository.db
      .collection(loanCollection)
      .where('debtorId', '==', debtorId)
      .get();
    if (loanRef.empty) {
      this.logger.log(`Loan with debtor id = ${debtorId} does not exist`);
      throw new NotFoundException(
        `Loan with debtor id = ${debtorId} does not exist`,
      );
    }
    return loanRef.docs.map(
      (loanDoc) =>
        LoanSchema.parse({ ...loanDoc.data(), id: loanDoc.id }) as Loan,
    ) as Loan[];
  }

  async authorizeDebtorByCreditorId(
    debtorId: string,
    creditorId: string,
  ): Promise<Loan> {
    const loan = LoanSchema.parse(
      (await this.findByDebtorId(debtorId))[0],
    ) as Loan;
    //  check if loan's creditor id is equal to the creditor id
    if (loan.creditorId !== creditorId) {
      this.logger.error(
        'Unauthorized to access debtor',
        'Creditor Id: ' + creditorId,
      );
      throw new UnauthorizedException('Unauthorized to access debtor');
    }
    return loan;
  }

  async authorizeLoanByCreditorId(
    loanId: string,
    creditorId: string,
  ): Promise<Loan> {
    const loan = await this.findByIdWithData(loanId);
    //  check if loan's creditor id is equal to the creditor id
    if (loan.creditorId !== creditorId) {
      this.logger.error(
        'Unauthorized to access debtor',
        'Creditor Id: ' + creditorId,
      );
      throw new UnauthorizedException('Unauthorized to access debtor');
    }
    return loan;
  }

  async findByIdWithData(id: string): Promise<Loan> {
    const docRef = this.firebaseRepository.db
      .collection(loanCollection)
      .doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Loan with this ${id} does not exist`, {
        cause: `Loan with this ${id} does not exist`,
      });
    }
    const data = LoanSchema.parse({ ...doc.data(), id: doc.id });
    return data as Loan;
  }

  async findAllByUserId(id: string): Promise<Loan[]> {
    try {
      const loansSnapshot = await this.firebaseRepository.db
        .collection(loanCollection)
        .where('creditorId', '==', id)
        .get();

      const loans = loansSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Loan,
      );
      return loans;
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message, {
        cause: err?.message,
      });
    }
  }

  async update(
    loanId: string,
    updateLoanDto: UpdateLoanDto,
  ): Promise<{ message: string }> {
    try {
      const docRef = await this.findById(loanId);

      await docRef.update({
        ...updateLoanDto,
        updatedAt: Date.now(),
      });
      return { message: 'Updated successfully' };
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message, {
        cause: err?.message,
      });
    }
  }

  async remove(id: string) {
    try {
      const docRef = await this.findById(id);
      if (!docRef) {
        return { message: `Loan not found: ${id}` };
      }
      await docRef.delete();
      return { message: 'Loan deleted successfully' };
    } catch (err: any) {
      throw new InternalServerErrorException(err?.message, {
        cause: err?.message,
      });
    }
  }
}
