import {
    Component,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter
} from '@angular/core';
import { IStation } from 'src/app/general/interfaces/station';
import { ITripOperationList } from 'src/app/general/interfaces/trip-operation-list';
import { findIndex } from 'lodash-es';
import moment from 'moment';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { Router } from '@angular/router';

@Component({
    selector: 'app-operation-route-diagram-drawing-presentational',
    templateUrl:
        './operation-route-diagram-drawing-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-drawing-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRouteDiagramDrawingPresentationalComponent {
    @Input() stations: IStation[];
    @Input() tripOperationLists: ITripOperationList[];
    @Input() calendar: ICalendar;
    @Output() clickNavigateTimetable: EventEmitter<{
        tripBlockId: string;
        tripDirection: 0 | 1;
    }> = new EventEmitter();

    constructor(private router: Router) {}

    returnTimeString(str: string) {
        return moment(str, 'HH:mm:ss').format('HHmm');
    }

    returnStationIndex(id: string) {
        return findIndex(this.stations, obj => {
            return obj.id === id;
        });
    }

    navigateTimetable(tripBlockId: string, tripDirection: 0 | 1) {
        this.router.navigate([
            'timetable',
            this.calendar.id,
            'all-line',
            { trip_direction: tripDirection, trip_block_id: tripBlockId }
        ]);
    }
}
