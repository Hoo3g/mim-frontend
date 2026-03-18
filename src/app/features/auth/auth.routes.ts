import { Routes } from '@angular/router';

export const authRoutes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('../../presentation/pages/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'verify-email',
        loadComponent: () => import('../../presentation/pages/verify-email.component').then(m => m.VerifyEmailComponent)
    },
    {
        path: 'register',
        loadComponent: () => import('../../presentation/pages/register.component').then(m => m.RegisterComponent)
    }
];
