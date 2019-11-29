import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IOperation } from 'src/app/general/interfaces/operation';

@Component({
    selector: 'app-operation-route-diagram-title-presentational',
    templateUrl:
        './operation-route-diagram-title-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-title-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationRouteDiagramTitlePresentationalComponent {
    @Input() calendar: ICalendar;
    @Input() operation: IOperation;

    constructor() {}
}
