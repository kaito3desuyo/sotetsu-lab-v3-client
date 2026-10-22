import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationPostInitialValue } from '../operation-post-card/operation-post-form.component';
import { OperationPostDialogComponent } from './operation-post-dialog.component';

@Injectable({ providedIn: 'root' })
export class OperationPostDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        initialValue: OperationPostInitialValue = {},
    ): MatDialogRef<OperationPostDialogComponent> {
        return this.#dialog.open(OperationPostDialogComponent, {
            width: '560px',
            maxWidth: 'calc(100vw - 32px)',
            data: initialValue,
            autoFocus: 'first-tabbable',
        });
    }
}
