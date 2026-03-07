export type PermissionOverrideEffect = 'GRANT' | 'DENY';
export type PermissionOverrideDraftEffect = 'INHERIT' | PermissionOverrideEffect;

export interface RbacPermissionDefinition {
    name: string;
    description?: string;
    resource: string;
    action: string;
    delegable: boolean;
}

export interface RbacRolePermission {
    role: string;
    description?: string;
    permissions: RbacPermissionDefinition[];
}

export interface RbacUserPermissionOverride {
    permission: string;
    effect: PermissionOverrideEffect;
}

export interface RbacUserAssignment {
    userId: string;
    displayName: string;
    email: string;
    accountStatus: string;
    roles: string[];
    effectivePermissions: string[];
    overrides: RbacUserPermissionOverride[];
    createdAt?: string;
}

export interface UpdateUserPermissionOverridesRequest {
    grants: string[];
    denies: string[];
}
