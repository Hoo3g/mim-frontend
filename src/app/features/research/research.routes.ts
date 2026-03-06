import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const researchRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../presentation/pages/research.component').then(m => m.ResearchComponent)
    },
    {
        path: 'my-papers',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/my-research-papers.component').then(m => m.MyResearchPapersComponent)
    },
    {
        path: 'editor',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/research-editor.component').then(m => m.ResearchEditorComponent)
    },
    {
        path: 'editor/:id',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/research-editor.component').then(m => m.ResearchEditorComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../../presentation/pages/research-detail.component').then(m => m.ResearchDetailComponent)
    }
];
