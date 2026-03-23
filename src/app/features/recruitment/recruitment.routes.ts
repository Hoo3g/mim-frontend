import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { verifiedGuard } from '../../core/guards/verified.guard';

export const recruitmentRoutes: Routes = [
    {
        path: '',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/posts.component').then(m => m.PostsComponent)
    },
    {
        path: 'my-posts',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/my-recruitment-posts.component').then(m => m.MyRecruitmentPostsComponent)
    },
    {
        path: 'my-posts/:id/statistics',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/recruitment-post-statistics.component').then(m => m.RecruitmentPostStatisticsComponent)
    },
    {
        path: 'editor',
        canActivate: [authGuard, verifiedGuard],
        loadComponent: () => import('../../presentation/pages/post-editor.component').then(m => m.PostEditorComponent)
    },
    {
        path: 'editor/:id',
        canActivate: [authGuard, verifiedGuard],
        loadComponent: () => import('../../presentation/pages/post-editor.component').then(m => m.PostEditorComponent)
    },
    {
        path: ':id',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/recruitment-detail-page.component').then(m => m.RecruitmentDetailPageComponent)
    }
];
