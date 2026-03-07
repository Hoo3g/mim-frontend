export interface ModerationPostItem {
    id: string;
    title: string;
    summary: string;
    authorName: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
}

export interface ModerationPaperItem {
    id: string;
    title: string;
    category: string;
    authorName: string;
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt?: string;
}

export interface ModerationActionRequest {
    action: 'APPROVE' | 'REJECT';
    comment?: string;
}
