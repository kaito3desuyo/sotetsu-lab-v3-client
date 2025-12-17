import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    Inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { OperationSightingInvalidationDialogData } from '../operation-sighting-invalidation-dialog/operation-sighting-invalidation-dialog.type';
import { OperationSightingRestorationDialogService } from './operation-sighting-restoration-dialog.service';

@Component({
    selector: 'app-operation-sighting-restoration-dialog',
    templateUrl: './operation-sighting-restoration-dialog.component.html',
    styleUrl: './operation-sighting-restoration-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSnackBarModule,
    ],
})
export class OperationSightingRestorationDialogComponent {
    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #operationSightingRestorationDialogService = inject(
        OperationSightingRestorationDialogService,
    );

    readonly form = this.#fb.group({
        reason: this.#fb.control('', [Validators.required]),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA)
        private readonly data: OperationSightingInvalidationDialogData,
    ) {}

    onClickClose(): void {
        this.#operationSightingRestorationDialogService.close();
    }

    async onClickSubmit(): Promise<void> {
        const { reason } = this.form.value;

        const result = await tryCatchAsync(
            this.#operationSightingRestorationDialogService.restore(reason),
            (e) => e as HttpErrorResponse,
        );

        if (result.isFailure()) {
            console.error('Invalidate failed:', result.error.error);

            this.#snackBar.open('復元に失敗しました。', '閉じる', {
                duration: 3000,
            });

            return;
        }

        this.#snackBar.open('復元に成功しました。', '閉じる', {
            duration: 3000,
        });

        this.#operationSightingRestorationDialogService.close(true);
    }
}
