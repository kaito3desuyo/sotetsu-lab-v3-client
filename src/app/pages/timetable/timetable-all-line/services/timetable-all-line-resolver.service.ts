import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TimetableAllLineStateStore } from '../states/timetable-all-line.state';
import { TimetableAllLineService } from './timetable-all-line.service';

@Injectable()
export class TimetableAllLineResolverService
    implements Resolve<Observable<void>>
{
    constructor(
        private readonly timetableAllLineService: TimetableAllLineService,
        private readonly timetableAllLineStateStore: TimetableAllLineStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const calendarId = route.paramMap.get('calendar_id');
        const tripDirection = +route.paramMap.get('trip_direction');
        const tripBlockId = route.paramMap.get('trip_block_id');

        this.timetableAllLineStateStore.setCalendarId(calendarId);
        this.timetableAllLineStateStore.setTripDirection(tripDirection);
        this.timetableAllLineStateStore.setTripBlockId(tripBlockId ?? null);

        return forkJoin([
            this.timetableAllLineService.fetchStationsV2(),
            this.timetableAllLineService.fetchTripBlocksV2(),
        ]).pipe(map(() => null));
    }
}
