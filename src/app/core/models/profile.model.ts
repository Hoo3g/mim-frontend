export type ProfileRole = 'STUDENT' | 'COMPANY' | 'LECTURER' | 'ADMIN';

export interface StudentProfileData {
    firstName?: string | null;
    lastName?: string | null;
    university?: string | null;
    major?: string | null;
    bio?: string | null;
    cvUrl?: string | null;
    studentType?: string | null;
    studentCode?: string | null;
    achievements?: string | null;
    careerGoal?: string | null;
    desiredPosition?: string | null;
}

export interface CompanyProfileData {
    name?: string | null;
    industry?: string | null;
    website?: string | null;
    location?: string | null;
    description?: string | null;
    logoUrl?: string | null;
}

export interface LecturerProfileData {
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    academicRank?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    researchInterests?: string[];
}

export interface ProfileMeResponse {
    userId: string;
    email: string;
    role: ProfileRole;
    accountStatus?: string | null;
    avatarUrl?: string | null;
    student?: StudentProfileData | null;
    company?: CompanyProfileData | null;
    lecturer?: LecturerProfileData | null;
}

export interface SavedPaperItem {
    paperId: string;
    title: string;
    researchArea?: string | null;
    category?: 'STUDENT' | 'LECTURER' | string | null;
    publicationYear?: number | null;
    savedAt?: string | null;
}

export interface PendingApplicationItem {
    applicationId: string;
    postId: string;
    postTitle: string;
    companyName?: string | null;
    postType?: string | null;
    location?: string | null;
    status?: string | null;
    appliedAt?: string | null;
}

export interface CompanyPostItem {
    postId: string;
    title: string;
    status?: string | null;
    approvalStatus?: string | null;
    pendingCount?: number | null;
    createdAt?: string | null;
}

export interface PendingApplicantItem {
    applicationId: string;
    postId: string;
    postTitle: string;
    applicantId: string;
    applicantName: string;
    message?: string | null;
    cvUrl?: string | null;
    appliedAt?: string | null;
}

export interface LecturerPaperItem {
    paperId: string;
    title: string;
    researchArea?: string | null;
    approvalStatus?: string | null;
    publicationYear?: number | null;
    createdAt?: string | null;
}

export interface CollaboratorItem {
    collaboratorId: string;
    name: string;
    collaboratorType?: 'STUDENT' | 'LECTURER' | string | null;
    paperCount?: number | null;
}

export interface StudentDashboardItem {
    savedPapers: SavedPaperItem[];
    pendingApplications: PendingApplicationItem[];
}

export interface CompanyDashboardItem {
    myPosts: CompanyPostItem[];
    pendingApplicants: PendingApplicantItem[];
}

export interface LecturerDashboardItem {
    myPapers: LecturerPaperItem[];
    collaborators: CollaboratorItem[];
}

export interface ProfileDashboardResponse {
    role: ProfileRole;
    student?: StudentDashboardItem | null;
    company?: CompanyDashboardItem | null;
    lecturer?: LecturerDashboardItem | null;
}

export interface UpdateStudentProfileRequest {
    firstName?: string | null;
    lastName?: string | null;
    university?: string | null;
    major?: string | null;
    bio?: string | null;
    cvUrl?: string | null;
    studentType?: string | null;
    achievements?: string | null;
    careerGoal?: string | null;
    desiredPosition?: string | null;
}

export interface UpdateCompanyProfileRequest {
    name?: string | null;
    industry?: string | null;
    website?: string | null;
    location?: string | null;
    description?: string | null;
    logoUrl?: string | null;
}

export interface UpdateLecturerProfileRequest {
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    academicRank?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    researchInterests?: string[];
}

export interface ProfileCvUploadResponse {
    objectKey: string;
    fileUrl: string;
}

export interface ProfileAvatarUploadResponse {
    objectKey: string;
    fileUrl: string;
}

export interface PendingApplicantResponse {
    applicationId: string;
    postId: string;
    postTitle: string;
    applicantId: string;
    applicantName: string;
    message?: string | null;
    cvUrl?: string | null;
    appliedAt?: string | null;
}

export interface PendingApplicationResponse {
    applicationId: string;
    postId: string;
    postTitle: string;
    companyName?: string | null;
    postType?: string | null;
    location?: string | null;
    status?: string | null;
    appliedAt?: string | null;
}
