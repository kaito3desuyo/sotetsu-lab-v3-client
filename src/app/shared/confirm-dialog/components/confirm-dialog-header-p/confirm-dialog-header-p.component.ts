import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog-header-p',
    templateUrl: './confirm-dialog-header-p.component.html',
    styleUrls: ['./confirm-dialog-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogHeaderPComponent {
    @Input() data: IConfirmDialogData;
    @Output() clickClose = new EventEmitter<void>();

    constructor() {}
}
