export type UserRole = 'admin' | 'manager' | 'employee';
export type ManagementRole = Exclude<UserRole, 'employee'>;

export const MANAGER_DEPARTMENT = 'IT';
