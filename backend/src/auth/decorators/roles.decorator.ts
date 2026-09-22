import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorator để chỉ định role được phép truy cập route.
 * @example @Roles('Admin', 'Trưởng đoàn')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
