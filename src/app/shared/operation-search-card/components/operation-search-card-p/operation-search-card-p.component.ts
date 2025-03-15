import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

@Component({
    selector: 'app-operation-search-card-p',
    templateUrl: './operation-search-card-p.component.html',
    styleUrls: ['./operation-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatRippleModule,
        DateFnsPipe,
    ]
})
export class OperationSearchCardPComponent {
    readonly calendarId = input.required<CalendarDetailsDto['calendarId']>();
    readonly operationId = input.required<OperationDetailsDto['operationId']>();
    readonly calendars = input.required<CalendarDetailsDto[]>();
    readonly operations = input.required<OperationDetailsDto[]>();

    readonly selectCalendarId = output<CalendarDetailsDto['calendarId']>();
    readonly selectOperationId = output<OperationDetailsDto['operationId']>();
    readonly clickSearch = output<void>();
    readonly clickSearchOperationTable =
        output<CalendarDetailsDto['calendarId']>();
}
