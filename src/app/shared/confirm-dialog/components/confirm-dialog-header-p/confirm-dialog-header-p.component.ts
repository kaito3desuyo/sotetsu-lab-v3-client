import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog-header-p',
    templateUrl: './confirm-dialog-header-p.component.html',
    styleUrls: ['./confirm-dialog-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule]
})
export class ConfirmDialogHeaderPComponent {
    data = input.required<IConfirmDialogData>();
    clickClose = output<void>();
}
