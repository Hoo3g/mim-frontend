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
    category: 'LECTURER' | 'STUDENT';
    viewCount: number;
    downloadCount: number;
    bookmarkCount: number;
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
    category: 'LECTURER' | 'STUDENT';
    publicationYear?: number | null;
    savedAt?: Date | null;
}
