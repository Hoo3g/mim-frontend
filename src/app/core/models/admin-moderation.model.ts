export interface ModerationResearchPaperLink {
    id: string;
    title: string;
    url?: string;
}

export interface ModerationPostItem {
    id: string;
    title: string;
    summary: string;
    description?: string;
    requirements?: string;
    benefits?: string;
    achievements?: string;
    authorName: string;
    authorAvatarUrl?: string;
    postType?: string;
    jobType?: string;
    studentCvUrl?: string;
    displayInfo?: Record<string, unknown>;
    location?: string;
    salaryRange?: string;
    status?: string;
    contactEmail?: string;
    contactPhone?: string;
    tags?: string[];
    researchPaperLinks?: ModerationResearchPaperLink[];
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
    updatedAt?: string;
}

export interface ModerationPaperAuthor {
    authorId?: string;
    name: string;
    mainAuthor?: boolean;
    isMainAuthor?: boolean;
    authorOrder?: number;
    canViewProfile?: boolean;
}

export interface ModerationPaperItem {
    id: string;
    title: string;
    category: string;
    paperAbstract?: string;
    pdfUrl?: string;
    publicationYear?: number;
    journalConference?: string;
    researchArea?: string;
    authorName: string;
    authors?: ModerationPaperAuthor[];
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
    updatedAt?: string;
}

export interface ModerationActionRequest {
    action: 'APPROVE' | 'REJECT';
    comment?: string;
}
