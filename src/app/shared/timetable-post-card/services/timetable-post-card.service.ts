import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ITimetablePostCardForm } from '../interfaces/timetable-post-card-form.interface';

@Injectable()
export class TimetablePostCardService {
    readonly #moveTimetableAddEvent$ = new Subject<ITimetablePostCardForm>();

    emitMoveTimetableAddEvent(state: ITimetablePostCardForm): void {
        this.#moveTimetableAddEvent$.next(state);
    }

    receiveMoveTimetableAddEvent(): Observable<ITimetablePostCardForm> {
        return this.#moveTimetableAddEvent$.asObservable();
    }
}
