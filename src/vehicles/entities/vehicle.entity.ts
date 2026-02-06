import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DefaultEntity } from '../../utils/entities/default.entity';

@Entity('vehicles')
export class Vehicle extends DefaultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  vin: string;

  @Column()
  make: string;

  @Column()
  model: string;

  @Column()
  year: number;

  @Column({ type: 'integer', nullable: true })
  mileageAdjustment: number;

  @Column({ type: 'integer', nullable: true })
  mileage: number;

  @Column()
  trim: string;

  @Column()
  weight: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
