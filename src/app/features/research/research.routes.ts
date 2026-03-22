import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';
import { verifiedGuard } from '../../core/guards/verified.guard';

export const researchRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../presentation/pages/research.component').then(m => m.ResearchComponent)
    },
    {
        path: 'filter',
        loadComponent: () => import('../../presentation/pages/research-filter.component').then(m => m.ResearchFilterComponent)
    },
    {
        path: 'my-papers',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/my-research-papers.component').then(m => m.MyResearchPapersComponent)
    },
    {
        path: 'saved',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/saved-research-papers.component').then(m => m.SavedResearchPapersComponent)
    },
    {
        path: 'editor',
        canActivate: [authGuard, verifiedGuard],
        loadComponent: () => import('../../presentation/pages/research-editor.component').then(m => m.ResearchEditorComponent)
    },
    {
        path: 'editor/:id',
        canActivate: [authGuard, verifiedGuard],
        loadComponent: () => import('../../presentation/pages/research-editor.component').then(m => m.ResearchEditorComponent)
    },
    {
        path: ':id',
        canActivate: [authGuard],
        loadComponent: () => import('../../presentation/pages/research-detail.component').then(m => m.ResearchDetailComponent)
    }
];
