import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
} from '@angular/core';

@Component({
    selector: 'app-calendar-select-dialog-header-p',
    templateUrl: './calendar-select-dialog-header-p.component.html',
    styleUrls: ['./calendar-select-dialog-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSelectDialogHeaderPComponent {
    @Output() clickCloseButton = new EventEmitter<void>();

    constructor() {}
}
