import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ProfileComponent } from './presentation/pages/profile.component';

/**
 * Root routes — sử dụng lazy loading cho từng feature.
 * Cấu trúc phân chia rõ public layout vs admin layout.
 */
export const routes: Routes = [
    // ─── Public layout (có Nav bar) ─────────────────────────
    {
        path: '',
        loadComponent: () => import('./layouts/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
        children: [
            { path: '', loadChildren: () => import('./features/research/research.routes').then(m => m.researchRoutes), pathMatch: 'full' },
            { path: 'research', loadChildren: () => import('./features/research/research.routes').then(m => m.researchRoutes) },
            { path: 'paper', loadChildren: () => import('./features/research/research.routes').then(m => m.researchRoutes) },
            { path: 'posts', loadChildren: () => import('./features/recruitment/recruitment.routes').then(m => m.recruitmentRoutes) },
            { path: 'recruitment', loadChildren: () => import('./features/recruitment/recruitment.routes').then(m => m.recruitmentRoutes) },
            { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes) },
            {
                path: 'profile',
                canActivate: [authGuard],
                component: ProfileComponent
            },
        ]
    },
    // ─── Admin layout (không có Nav bar public) ─────────────
    {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.routes').then(m => m.adminRoutes)
    },
    // ─── Fallback ────────────────────────────────────────────
    { path: '**', redirectTo: '' }
];
