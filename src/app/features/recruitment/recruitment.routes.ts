import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const recruitmentRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../presentation/pages/posts.component').then(m => m.PostsComponent)
    },
    {
        path: 'my-posts',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/my-recruitment-posts.component').then(m => m.MyRecruitmentPostsComponent)
    },
    {
        path: 'editor',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/post-editor.component').then(m => m.PostEditorComponent)
    },
    {
        path: 'editor/:id',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/post-editor.component').then(m => m.PostEditorComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../../presentation/pages/post-detail.component').then(m => m.PostDetailComponent)
    }
];
