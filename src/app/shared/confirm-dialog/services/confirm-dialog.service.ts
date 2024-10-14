import { inject, Injectable } from '@angular/core';
import {
    MatDialog,
    MatDialogConfig,
    MatDialogRef,
} from '@angular/material/dialog';
import extend from 'just-extend';
import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { IConfirmDialogData } from '../interfaces/confirm-dialog-data.interface';

@Injectable({
    providedIn: 'root',
})
export class ConfirmDialogService {
    readonly #dialog = inject(MatDialog);
    #dialogRef: MatDialogRef<ConfirmDialogComponent>;

    open(
        config?: MatDialogConfig<IConfirmDialogData>,
    ): MatDialogRef<ConfirmDialogComponent> {
        const defaultConfig: MatDialogConfig<IConfirmDialogData> = {
            width: '360px',
            autoFocus: false,
            disableClose: true,
        };

        this.#dialogRef = this.#dialog.open<
            ConfirmDialogComponent,
            IConfirmDialogData,
            boolean
        >(ConfirmDialogComponent, extend(true, defaultConfig, config));

        return this.#dialogRef;
    }

    close(bool = false): void {
        this.#dialogRef.close(bool);
    }
}
