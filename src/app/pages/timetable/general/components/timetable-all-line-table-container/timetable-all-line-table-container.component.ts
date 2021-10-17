import { Component, OnInit } from '@angular/core';
import { TimetableAllLineService } from '../../services/timetable-all-line.service';
import { Observable } from 'rxjs';
import { ITimetableStation } from '../../interfaces/timetable-station';
import { ITrip } from 'src/app/general/interfaces/trip';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { TimetableCalendarSelectDialogComponent } from '../timetable-calendar-select-dialog/timetable-calendar-select-dialog.component';

@Component({
    selector: 'app-timetable-all-line-table-container',
    templateUrl: './timetable-all-line-table-container.component.html',
    styleUrls: ['./timetable-all-line-table-container.component.scss'],
})
export class TimetableAllLineTableContainerComponent {
    tripDirection$: Observable<'0' | '1'>;
    stations$: Observable<ITimetableStation[]>;
    trips$: Observable<ITrip[]>;

    isGroupingMode$: Observable<boolean>;
    groupingBaseTrip$: Observable<ITrip>;

    pageSettings$: Observable<PageEvent>;

    constructor(
        private router: Router,
        private dialog: MatDialog,
        private timetableAllLineService: TimetableAllLineService
    ) {
        this.tripDirection$ = this.timetableAllLineService.getTripDirection();
        this.stations$ = this.timetableAllLineService.getStations();
        this.trips$ = this.timetableAllLineService.getTripsSorted();

        this.isGroupingMode$ = this.timetableAllLineService
            .getGroupingBaseTrip()
            .pipe(map((data) => (data ? true : false)));
        this.groupingBaseTrip$ = this.timetableAllLineService.getGroupingBaseTrip();

        this.pageSettings$ = this.timetableAllLineService.getPageSetting();
    }

    onReceiveClickEdit(blockId: string): void {
        this.router.navigate(['timetable', 'update', blockId]);
    }

    onReceiveClickCopy(blockId: string): void {
        const dialogRef = this.dialog.open(
            TimetableCalendarSelectDialogComponent,
            {
                width: '480px',
                data: {},
            }
        );

        dialogRef.afterClosed().subscribe((calendarId) => {
            if (calendarId) {
                this.router.navigate([
                    'timetable',
                    'copy',
                    { calendarId, tripBlockId: blockId },
                ]);
            }
        });
    }

    onReceiveClickDelete(trip: ITrip): void {
        this.timetableAllLineService.deleteTripById(trip);
    }

    onReceiveClickGrouping(trip: ITrip): void {
        this.timetableAllLineService.setGroupingBaseTrip(trip);
    }

    onReceiveClickAddTripInGroup(trip: ITrip): void {
        this.timetableAllLineService.addTripInBaseTripBlock(trip);
    }

    onReceiveClickRemoveTripInGroup(trip: ITrip): void {
        this.timetableAllLineService.removeTripInBaseTripBlock(trip);
    }
}
