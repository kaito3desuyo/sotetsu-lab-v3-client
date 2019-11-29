import {
    Component,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

@Component({
    selector: 'app-timetable-all-line-paginator-presentational',
    templateUrl: './timetable-all-line-paginator-presentational.component.html',
    styleUrls: ['./timetable-all-line-paginator-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableAllLinePaginatorPresentationalComponent {
    @Input() pageSetting: PageEvent;
    @Output() paging: EventEmitter<PageEvent> = new EventEmitter<PageEvent>();

    constructor() {}
}
