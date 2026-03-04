import { Routes } from '@angular/router';

export const recruitmentRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../presentation/pages/posts.component').then(m => m.PostsComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../../presentation/pages/post-detail.component').then(m => m.PostDetailComponent)
    }
];
