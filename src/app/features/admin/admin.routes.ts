import { Routes } from '@angular/router';
import { adminGuard } from '../../core/guards/admin.guard';

export const adminRoutes: Routes = [
    {
        path: '',
        canActivate: [adminGuard],
        loadComponent: () => import('../../presentation/pages/admin/admin-dashboard.component').then(m => m.AdminDashboardComponent)
    }
];
