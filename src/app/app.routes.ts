import { Routes } from '@angular/router';
import { PostsComponent } from './presentation/pages/posts.component';
import { ResearchComponent } from './presentation/pages/research.component';
import { ResearchDetailComponent } from './presentation/pages/research-detail.component';

export const routes: Routes = [
    { path: '', component: ResearchComponent }, // List View
    { path: 'paper/:id', component: ResearchDetailComponent }, // Detail View
    { path: 'recruitment', component: PostsComponent },
    { path: '**', redirectTo: '' }
];
