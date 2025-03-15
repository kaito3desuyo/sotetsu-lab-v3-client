import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';
import {
    ConfirmDialogStateQuery,
    ConfirmDialogStateStore,
} from '../../states/confirm-dialog.state';
import { ConfirmDialogHeaderCComponent } from '../confirm-dialog-header-c/confirm-dialog-header-c.component';
import { ConfirmDialogMainCComponent } from '../confirm-dialog-main-c/confirm-dialog-main-c.component';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ConfirmDialogHeaderCComponent, ConfirmDialogMainCComponent],
    providers: [ConfirmDialogStateStore, ConfirmDialogStateQuery]
})
export class ConfirmDialogComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) private readonly data: IConfirmDialogData,
        private readonly confirmDialogStateStore: ConfirmDialogStateStore,
    ) {
        this.confirmDialogStateStore.setData(this.data);
    }
}
