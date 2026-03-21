import { ApprovalStatus, PostStatus } from '../enums/post-status.enum';
import { JobType, PostType } from '../enums/post-type.enum';
export { ApprovalStatus, PostStatus, PostType, JobType };
export interface StudentPostDisplayInfo {
    studentUniversity?: string;
    studentMajor?: string;
    studentType?: string;
    studentDesiredPosition?: string;
    studentBio?: string;
    studentCareerGoal?: string;
    studentAchievements?: string;
}

export interface PostDisplayInfo extends StudentPostDisplayInfo {
    [key: string]: unknown;
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
    displayInfo?: PostDisplayInfo;
    location?: string;
    salaryRange?: string;
    status: PostStatus;
    approvalStatus?: ApprovalStatus;
    moderationComment?: string;
    createdAt: Date;
    updatedAt: Date;
}
