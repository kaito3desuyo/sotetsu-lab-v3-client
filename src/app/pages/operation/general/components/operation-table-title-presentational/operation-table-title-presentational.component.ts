import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
    selector: 'app-operation-table-title-presentational',
    templateUrl: './operation-table-title-presentational.component.html',
    styleUrls: ['./operation-table-title-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationTableTitlePresentationalComponent {
    @Input() calendar: ICalendar;

    constructor() {}
}
