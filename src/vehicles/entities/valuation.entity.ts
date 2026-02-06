import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DefaultEntity } from '../../utils/entities/default.entity';
import { Vehicle } from './vehicle.entity';

@Entity('valuations')
export class Valuation extends DefaultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Vehicle)
  vehicle: Vehicle;

  @Column()
  estimatedValue: number;

  @Column()
  provider: string;
}
