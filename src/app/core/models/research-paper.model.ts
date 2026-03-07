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
    approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    moderationComment?: string;
    isBookmarked?: boolean;
    authors: PaperAuthor[];
    createdAt: Date;
    updatedAt: Date;
}
