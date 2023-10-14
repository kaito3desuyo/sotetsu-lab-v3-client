import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IConfirmDialogData } from '../../interfaces/confirm-dialog-data.interface';
import {
    ConfirmDialogStateQuery,
    ConfirmDialogStateStore,
} from '../../states/confirm-dialog.state';

@Component({
    templateUrl: './confirm-dialog.component.html',
    styleUrls: ['./confirm-dialog.component.scss'],
    providers: [ConfirmDialogStateStore, ConfirmDialogStateQuery],
})
export class ConfirmDialogComponent {
    constructor(
        @Inject(MAT_DIALOG_DATA) private readonly data: IConfirmDialogData,
        private readonly confirmDialogStateStore: ConfirmDialogStateStore
    ) {
        this.confirmDialogStateStore.setData(this.data);
    }
}
