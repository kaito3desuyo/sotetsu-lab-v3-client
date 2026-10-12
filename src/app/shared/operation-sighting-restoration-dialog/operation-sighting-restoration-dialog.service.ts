import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationSightingRestorationDialogComponent } from './operation-sighting-restoration-dialog.component';
import { OperationSightingRestorationDialogData } from './operation-sighting-restoration-dialog.type';

@Injectable({
    providedIn: 'root',
})
export class OperationSightingRestorationDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        data: OperationSightingRestorationDialogData,
    ): MatDialogRef<OperationSightingRestorationDialogComponent, boolean> {
        return this.#dialog.open<
            OperationSightingRestorationDialogComponent,
            OperationSightingRestorationDialogData,
            boolean
        >(OperationSightingRestorationDialogComponent, {
            width: '360px',
            autoFocus: false,
            disableClose: true,
            data,
        });
    }
}
