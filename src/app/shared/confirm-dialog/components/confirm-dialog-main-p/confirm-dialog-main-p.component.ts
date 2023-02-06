import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { MatLegacyButton as MatButton } from '@angular/material/legacy-button';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog-main-p',
    templateUrl: './confirm-dialog-main-p.component.html',
    styleUrls: ['./confirm-dialog-main-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialogMainPComponent implements OnInit {
    @Input() data: IConfirmDialogData;
    @Output() clickButton = new EventEmitter<boolean>();

    @ViewChild('cancelButton', { static: true }) cancelButton: MatButton;
    @ViewChild('goButton', { static: true }) goButton: MatButton;

    constructor() {}

    ngOnInit(): void {
        setTimeout(() => {
            if (this.data.goButtonColor === 'warn') {
                this.cancelButton.focus();
            } else {
                this.goButton.focus();
            }
        }, 0);
    }
}
