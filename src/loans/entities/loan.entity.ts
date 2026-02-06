import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DefaultEntity } from '../../utils/entities/default.entity';
import { Vehicle } from 'src/vehicles/entities/vehicle.entity';

export enum LoanStatus {
  SUBMITTED = 'SUBMITTED',
  VALUED = 'VALUED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  DISBURSED = 'DISBURSED',
}

@Entity('loans')
export class Loan extends DefaultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  applicantEmail: string; // In a full fledged application, i would relate this to a User entity

  @Column()
  applicantName: string;

  @Column()
  monthlyIncome: number;

  @Column()
  requestedAmount: number;

  @Column({
    type: 'text',
    default: LoanStatus.PENDING,
  })
  status: LoanStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Vehicle)
  vehicle: Vehicle;

  @Column()
  ltv: number;

  @Column()
  creditScore: number;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  rejectedBy: string;

  @Column({ unique: true })
  idempotencyKey: string;
}
