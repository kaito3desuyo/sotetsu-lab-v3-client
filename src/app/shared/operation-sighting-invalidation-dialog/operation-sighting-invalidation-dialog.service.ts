import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationSightingInvalidationDialogComponent } from './operation-sighting-invalidation-dialog.component';
import { OperationSightingInvalidationDialogData } from './operation-sighting-invalidation-dialog.type';

@Injectable({
    providedIn: 'root',
})
export class OperationSightingInvalidationDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        data: OperationSightingInvalidationDialogData,
    ): MatDialogRef<OperationSightingInvalidationDialogComponent, boolean> {
        return this.#dialog.open<
            OperationSightingInvalidationDialogComponent,
            OperationSightingInvalidationDialogData,
            boolean
        >(OperationSightingInvalidationDialogComponent, {
            width: '360px',
            autoFocus: false,
            disableClose: true,
            data,
        });
    }
}
