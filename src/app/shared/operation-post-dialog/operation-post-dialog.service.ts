import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationPostInitialValue } from '../operation-post-card/operation-post-form.component';
import {
    OPERATION_POST_DIALOG_TITLE_ID,
    OperationPostDialogComponent,
} from './operation-post-dialog.component';

@Injectable({ providedIn: 'root' })
export class OperationPostDialogService {
    readonly #dialog = inject(MatDialog);

    open(
        initialValue: OperationPostInitialValue = {},
    ): MatDialogRef<OperationPostDialogComponent> {
        return this.#dialog.open(OperationPostDialogComponent, {
            width: '560px',
            maxWidth: 'calc(100vw - 32px)',
            // キーボードが開いて縮んでも、面の中でスクロールして投稿ボタンに届くように
            maxHeight: 'calc(100dvh - 32px)',
            ariaLabelledBy: OPERATION_POST_DIALOG_TITLE_ID,
            data: initialValue,
            autoFocus: 'first-tabbable',
        });
    }
}
