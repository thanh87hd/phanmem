/**
 * Shape of the decoded JWT payload attached to `request.user` by Passport.
 * Mirrors the object returned by {@link JwtStrategy.validate}.
 */
export class JwtPayload {
  userId!: number;
  username!: string;
  role!: string;
  permissions!: string[];
  department!: string;
  legacyDepartment!: string;
  fullName?: string;
}
