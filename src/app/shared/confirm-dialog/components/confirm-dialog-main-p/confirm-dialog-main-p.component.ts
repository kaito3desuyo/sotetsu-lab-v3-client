import {
    ChangeDetectionStrategy,
    Component,
    input,
    OnInit,
    output,
    ViewChild,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { wait } from 'src/app/core/utils/wait';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    standalone: true,
    selector: 'app-confirm-dialog-main-p',
    templateUrl: './confirm-dialog-main-p.component.html',
    styleUrls: ['./confirm-dialog-main-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule],
})
export class ConfirmDialogMainPComponent implements OnInit {
    data = input.required<IConfirmDialogData>();
    clickButton = output<boolean>();

    @ViewChild('cancelButton', { static: true })
    cancelButton: MatButton;

    @ViewChild('goButton', { static: true })
    goButton: MatButton;

    async ngOnInit(): Promise<void> {
        await wait(0);
        if (this.data().goButtonColor === 'warn') {
            this.cancelButton.focus();
        } else {
            this.goButton.focus();
        }
    }
}
