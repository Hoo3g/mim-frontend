import { ApprovalStatus } from '../enums/post-status.enum';
import { Role } from '../enums/role.enum';

export interface PaperAuthor {
    studentId: string;
    name: string;
    isMainAuthor: boolean;
    authorOrder: number;
}

export interface ResearchPaper {
    id: string;
    title: string;
    abstract: string;
    pdfUrl: string;
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
    publicationYear?: number | null;
    savedAt?: Date | null;
}
