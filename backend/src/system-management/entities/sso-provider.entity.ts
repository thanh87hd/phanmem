import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sso_providers')
export class SsoProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, default: 'ldap' })
  // ldap | ad | saml | oauth2
  type: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ length: 255, default: '' })
  host: string;

  @Column({ default: 389 })
  port: number;

  @Column({ length: 500, default: '' })
  baseDn: string;

  @Column({ length: 500, default: '' })
  bindDn: string;

  @Column({ length: 500, default: '' })
  bindPassword: string;

  @Column({ length: 500, default: '' })
  userSearchBase: string;

  @Column({ length: 200, default: '(sAMAccountName={{username}})' })
  userSearchFilter: string;

  @Column({ length: 500, default: '' })
  groupSearchBase: string;

  @Column({ type: 'jsonb', default: {} })
  groupRoleMapping: Record<string, string>;

  @Column({ default: false })
  tlsEnabled: boolean;

  @Column({ length: 20, default: 'disconnected' })
  // connected | disconnected | testing
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
