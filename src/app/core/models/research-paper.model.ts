import { ApprovalStatus } from '../enums/post-status.enum';
import { Role } from '../enums/role.enum';

export interface PaperAuthor {
    studentId: string;
    name: string;
    authorType?: 'STUDENT' | 'LECTURER';
    isMainAuthor: boolean;
    authorOrder: number;
    canViewProfile?: boolean;
}

export interface ResearchPaper {
    id: string;
    title: string;
    abstract: string;
    pdfUrl: string;
    paperType: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS';
    publicationYear: number;
    journalConference?: string;
    researchArea: string;
    category: Role.LECTURER | Role.STUDENT;
    viewCount: number;
    downloadCount: number;
    bookmarkCount: number;
    approvalStatus?: ApprovalStatus;
    moderationComment?: string;
    isBookmarked?: boolean;
    authors: PaperAuthor[];
    createdAt: Date;
    updatedAt: Date;
}

export interface BookmarkedResearchPaper {
    paperId: string;
    title: string;
    researchArea: string;
    category: Role.LECTURER | Role.STUDENT;
    paperType?: 'SCIENTIFIC_RESEARCH' | 'GRADUATION_THESIS';
    publicationYear?: number | null;
    savedAt?: Date | null;
}
