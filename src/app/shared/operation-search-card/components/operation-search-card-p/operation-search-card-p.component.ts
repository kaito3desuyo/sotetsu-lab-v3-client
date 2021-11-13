import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter,
} from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Component({
    selector: 'app-operation-search-card-p',
    templateUrl: './operation-search-card-p.component.html',
    styleUrls: ['./operation-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationSearchCardPComponent {
    calendarId: CalendarDetailsDto['calendarId'];

    @Input() calendars: CalendarDetailsDto[];
    @Output() clickSearchOperationTable = new EventEmitter<
        CalendarDetailsDto['calendarId']
    >();

    constructor() {}
}
