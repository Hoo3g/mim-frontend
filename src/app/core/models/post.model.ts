export enum PostType {
    STUDENT_SEEKING_JOB = 'STUDENT_SEEKING_JOB',
    COMPANY_RECRUITING_JOB = 'COMPANY_RECRUITING_JOB',
    STUDENT_SEEKING_INTERNSHIP = 'STUDENT_SEEKING_INTERNSHIP',
    COMPANY_RECRUITING_INTERNSHIP = 'COMPANY_RECRUITING_INTERNSHIP'
}

export enum JobType {
    FULL_TIME = 'FULL_TIME',
    PART_TIME = 'PART_TIME',
    CONTRACT = 'CONTRACT',
    INTERNSHIP = 'INTERNSHIP'
}

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorAvatarUrl?: string;
    title: string;
    description: string;
    requirements?: string;
    achievements?: string;
    benefits?: string;
    postType: PostType;
    jobType: JobType;
    tags?: string[];
    studentCvUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    researchPaperLinks?: { title: string, url: string, id?: string }[];
    displayInfo?: any;
    location?: string;
    salaryRange?: string;
    status: 'OPEN' | 'CLOSED' | 'DRAFT';
    createdAt: Date;
    updatedAt: Date;
}
