export interface LoginRequest {
    identifier: string;
    password: string;
    // Backward compatibility during migration
    email?: string;
}

export type UserType = 'STUDENT' | 'LECTURER' | 'COMPANY' | 'ADMIN';
export type AccountStatus = 'PENDING' | 'APPROVED' | 'BLOCKED' | string;

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    studentId?: string;
    userType: UserType;
}

export interface GoogleLoginRequest {
    idToken: string;
    userType?: UserType;
}

export interface AuthApiUser {
    id: string;
    email: string;
    status: AccountStatus;
    fullName?: string | null;
    avatarUrl?: string | null;
    roles: string[];
    permissions?: string[];
}

export interface AuthResponse {
    accessToken: string;
    refreshToken?: string | null;
    user: AuthApiUser;
}
