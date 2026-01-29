import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ResearchPaper } from '../models/research-paper.model';
import { MOCK_PAPERS, MOCK_NEWS } from '../../infrastructure/mock/data';

@Injectable({
    providedIn: 'root'
})
export class ResearchPaperService {
    getPapers(): Observable<ResearchPaper[]> {
        return of(MOCK_PAPERS);
    }

    getPaperById(id: string): Observable<ResearchPaper | undefined> {
        return of(MOCK_PAPERS.find(p => p.id === id));
    }

    getNews(): Observable<any[]> {
        return of(MOCK_NEWS);
    }
}
