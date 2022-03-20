import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';

@Component({
    selector: 'app-operation-sightings-table-by-date-presentational',
    templateUrl:
        './operation-sightings-table-by-date-presentational.component.html',
    styleUrls: [
        './operation-sightings-table-by-date-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationSightingsTableByDatePresentationalComponent {
    @Input() calendars: { date: string; calendar: CalendarDetailsDto }[];
    @Input() formations: FormationDetailsDto[];
    @Input() operationSightings: {
        [formationId: string]: {
            [date: string]: OperationSightingDetailsDto[];
        };
    };

    constructor() {}
}
