import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { AppButtonComponent } from '../../../app-button/app-button.component';
import { PanelCardComponent } from '../../../panel-card/panel-card.component';

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
        MatIconModule,
        MatListModule,
        AppButtonComponent,
        PanelCardComponent,
        DateFnsPipe,
    ],
})
export class OperationSearchCardPComponent {
    readonly calendarId = input.required<CalendarDetailsDto['calendarId']>();
    readonly operationId = input.required<OperationDetailsDto['operationId']>();
    readonly calendars = input.required<CalendarDetailsDto[]>();
    readonly operations = input.required<OperationDetailsDto[]>();

    readonly selectCalendarId = output<CalendarDetailsDto['calendarId']>();
    readonly selectOperationId = output<OperationDetailsDto['operationId']>();
    readonly clickSearchOperationTable =
        output<CalendarDetailsDto['calendarId']>();
    readonly clickSearchRouteDiagram =
        output<OperationDetailsDto['operationId']>();

    /** 運用番号まで選んでいれば運用行路図、ダイヤだけなら運用表へ移る。 */
    submit(): void {
        const operationId = this.operationId();
        if (operationId) {
            this.clickSearchRouteDiagram.emit(operationId);
            return;
        }
        this.clickSearchOperationTable.emit(this.calendarId());
    }
}
