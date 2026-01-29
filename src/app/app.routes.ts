import { Routes } from '@angular/router';
import { PostsComponent } from './presentation/pages/posts.component';
import { ResearchComponent } from './presentation/pages/research.component';
import { ResearchDetailComponent } from './presentation/pages/research-detail.component';
import { AdminDashboardComponent } from './presentation/pages/admin/admin-dashboard.component';
import { RegisterComponent } from './presentation/pages/register.component';

export const routes: Routes = [
    { path: '', component: ResearchComponent },
    { path: 'paper/:id', component: ResearchDetailComponent },
    { path: 'recruitment', component: PostsComponent },
    { path: 'admin', component: AdminDashboardComponent },
    { path: 'register', component: RegisterComponent },
    { path: '**', redirectTo: '' }
];
