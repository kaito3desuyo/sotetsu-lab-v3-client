import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

@Component({
    standalone: true,
    selector: 'app-calendar-select-dialog-main-p',
    templateUrl: './calendar-select-dialog-main-p.component.html',
    styleUrls: ['./calendar-select-dialog-main-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        PipesModule,
    ],
})
export class CalendarSelectDialogMainPComponent {
    selected: CalendarDetailsDto['calendarId'] = undefined;

    calendars = input.required<CalendarDetailsDto[]>();
    clickSelect = output<CalendarDetailsDto['calendarId']>();
}
