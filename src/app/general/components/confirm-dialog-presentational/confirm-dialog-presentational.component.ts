import {
    Component,
    OnInit,
    Input,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
} from '@angular/core';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog-presentational',
    templateUrl: './confirm-dialog-presentational.component.html',
    styleUrls: ['./confirm-dialog-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogPresentationalComponent implements OnInit {
    @Input() data: IConfirmDialogData;
    @Output() clickButton: EventEmitter<boolean> = new EventEmitter<boolean>();

    constructor() {}

    ngOnInit() {}

    onClickCancel() {
        this.clickButton.emit(false);
    }

    onClickGo() {
        this.clickButton.emit(true);
    }
}
