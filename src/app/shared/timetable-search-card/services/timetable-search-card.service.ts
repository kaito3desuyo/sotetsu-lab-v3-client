import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ITimetableSearchCardForm } from '../interfaces/timetable-search-card-form.interface';

@Injectable()
export class TimetableSearchCardService {
    private _searchTimetableEvent$ = new Subject<ITimetableSearchCardForm>();

    constructor() {}

    emitSearchTimetableEvent(state: ITimetableSearchCardForm): void {
        this._searchTimetableEvent$.next(state);
    }

    receiveSearchTimetableEvent(): Observable<ITimetableSearchCardForm> {
        return this._searchTimetableEvent$.asObservable();
    }
}
