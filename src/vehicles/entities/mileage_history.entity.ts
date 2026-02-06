import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DefaultEntity } from '../../utils/entities/default.entity';
import { Vehicle } from './vehicle.entity';

@Entity('mileage_history')
export class MileageHistory extends DefaultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vehicle, { onDelete: 'CASCADE' })
  vehicle: Vehicle;

  @Column()
  mileage: number;

  @Column({ default: false })
  isAnomalous: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
