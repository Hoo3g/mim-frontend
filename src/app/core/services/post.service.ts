import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Post } from '../models/post.model';
import { MOCK_POSTS } from '../../infrastructure/mock/data';

@Injectable({
    providedIn: 'root'
})
export class PostService {
    getPosts(): Observable<Post[]> {
        return of(MOCK_POSTS);
    }

    getPostById(id: string): Observable<Post | undefined> {
        return of(MOCK_POSTS.find(p => p.id === id));
    }
}
