import { inject, Injectable } from '@angular/core';
import {
    MatDialog,
    MatDialogConfig,
    MatDialogRef,
} from '@angular/material/dialog';
import { merge } from 'es-toolkit/compat';
import { ConfirmDialogComponent } from '../confirm-dialog.component';
import { IConfirmDialogData } from '../interfaces/confirm-dialog-data.interface';

@Injectable({
    providedIn: 'root',
})
export class ConfirmDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        config?: MatDialogConfig<IConfirmDialogData>,
    ): MatDialogRef<ConfirmDialogComponent> {
        const defaultConfig: MatDialogConfig<IConfirmDialogData> = {
            width: '360px',
            autoFocus: false,
            disableClose: true,
        };

        return this.#dialog.open<
            ConfirmDialogComponent,
            IConfirmDialogData,
            boolean
        >(ConfirmDialogComponent, merge(defaultConfig, config));
    }
}
