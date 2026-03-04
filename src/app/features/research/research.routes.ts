import { Routes } from '@angular/router';

export const researchRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('../../presentation/pages/research.component').then(m => m.ResearchComponent)
    },
    {
        path: ':id',
        loadComponent: () => import('../../presentation/pages/research-detail.component').then(m => m.ResearchDetailComponent)
    }
];
