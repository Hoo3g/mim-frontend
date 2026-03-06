import { Routes } from '@angular/router';

export const authRoutes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('../../presentation/pages/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('../../presentation/pages/register.component').then(m => m.RegisterComponent)
    }
];
