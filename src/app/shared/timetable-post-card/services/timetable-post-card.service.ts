import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ITimetablePostCardForm } from '../interfaces/timetable-post-card-form.interface';

@Injectable()
export class TimetablePostCardService {
    private _moveTimetableAddEvent$ = new Subject<ITimetablePostCardForm>();

    constructor() {}

    emitMoveTimetableAddEvent(state: ITimetablePostCardForm): void {
        this._moveTimetableAddEvent$.next(state);
    }

    receiveMoveTimetableAddEvent(): Observable<ITimetablePostCardForm> {
        return this._moveTimetableAddEvent$.asObservable();
    }
}
