export interface Organization {
  id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  can_add_devices: boolean;
  max_devices: number | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationDto {
  name: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface OrgMember {
  user_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  organization_id: string;
}
