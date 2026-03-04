export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    studentId?: string;
    userType: 'STUDENT' | 'LECTURER' | 'COMPANY';
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: string;
    };
}
