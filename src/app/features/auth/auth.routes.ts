import { Routes } from '@angular/router';

export const authRoutes: Routes = [
    {
        path: 'login',
        // TODO: loadComponent(() => import('./components/login/login.component').then(m => m.LoginComponent))
        redirectTo: '/auth/register'
    },
    {
        path: 'register',
        loadComponent: () => import('../../presentation/pages/register.component').then(m => m.RegisterComponent)
    }
];
