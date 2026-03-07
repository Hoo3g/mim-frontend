export interface ResearchHeroContent {
    pageKey: string;
    titlePrefix: string;
    titleHighlight: string;
    subtitle: string;
    imageUrl: string;
    updatedAt?: string;
}

export interface UpdateResearchHeroContentRequest {
    titlePrefix: string;
    titleHighlight: string;
    subtitle: string;
    imageUrl: string;
}

export interface HeroImageUploadResponse {
    objectKey: string;
    fileUrl: string;
}
