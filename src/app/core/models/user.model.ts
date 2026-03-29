export type FleetRole = 'owner' | 'admin' | 'member' | 'viewer';
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  preferences?: {
    theme?: string;
    notifications?: boolean;
    [key: string]: unknown;
  };
  created_at: string;
  last_login?: string;
}

export interface FleetMember {
  fleet_id: string;
  user_id: string;
  role: FleetRole;
  joined_at: string;
  user?: User;
}
