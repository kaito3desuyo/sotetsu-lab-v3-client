import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../states/timetable-all-line.state';
import { TimetableAllLineService } from './timetable-all-line.service';

@Injectable()
export class TimetableAllLineResolverService {
    constructor(
        private readonly timetableAllLineService: TimetableAllLineService,
        private readonly timetableAllLineStateStore: TimetableAllLineStateStore,
        private readonly timetableAllLineStateQuery: TimetableAllLineStateQuery,
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        const tripDirection = +route.paramMap.get('trip_direction');
        const tripBlockId = route.paramMap.get('trip_block_id');

        const prevCalendarId = this.timetableAllLineStateQuery.calendarId;
        const prevTripDirection = this.timetableAllLineStateQuery.tripDirection;
        const prevTripBlockId = this.timetableAllLineStateQuery.tripBlockId;

        if (
            calendarId !== prevCalendarId ||
            tripDirection !== prevTripDirection ||
            tripBlockId !== prevTripBlockId
        ) {
            this.timetableAllLineStateStore.updatePageSettings({
                pageIndex: 0,
            });
        }

        this.timetableAllLineStateStore.setCalendarId(calendarId);
        this.timetableAllLineStateStore.setTripDirection(tripDirection);
        this.timetableAllLineStateStore.setTripBlockId(tripBlockId ?? null);

        return forkJoin([
            this.timetableAllLineService.fetchStationsV2(),
            this.timetableAllLineService.fetchTripBlocksV2(),
        ]).pipe(map(() => null));
    }
}
