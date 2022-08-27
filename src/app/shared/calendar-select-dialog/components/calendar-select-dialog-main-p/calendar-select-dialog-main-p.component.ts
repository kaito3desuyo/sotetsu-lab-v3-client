import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Component({
    selector: 'app-calendar-select-dialog-main-p',
    templateUrl: './calendar-select-dialog-main-p.component.html',
    styleUrls: ['./calendar-select-dialog-main-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSelectDialogMainPComponent {
    selected: CalendarDetailsDto['calendarId'] = undefined;

    @Input() calendars: CalendarDetailsDto[];

    @Output() clickSelect = new EventEmitter<
        CalendarDetailsDto['calendarId']
    >();

    constructor() {}
}
