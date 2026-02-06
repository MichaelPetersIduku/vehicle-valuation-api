import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DefaultEntity } from '../../utils/entities/default.entity';
import { Loan } from './loan.entity';

@Entity('offers')
export class Offer extends DefaultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Loan)
  loan: Loan;

  @Column()
  amount: number;

  @Column()
  interestRate: number;

  @Column()
  monthlyPayment: number;

  @Column()
  offerType: string; // e.g., 'express', 'standard', 'premium'

  @Column()
  totalInterest: number;

  @Column()
  tenureMonths: number;

  @CreateDateColumn()
  createdAt: Date;
}
