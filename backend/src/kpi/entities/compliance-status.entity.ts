import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('compliance_status')
export class ComplianceStatus {
  @PrimaryColumn()
  id: string;

  @Column({ default: false })
  checked: boolean;
}
