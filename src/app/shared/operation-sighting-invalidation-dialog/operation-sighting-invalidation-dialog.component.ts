import {
    ChangeDetectionStrategy,
    Component,
    Inject,
    inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { OperationSightingInvalidationDialogService } from './operation-sighting-invalidation-dialog.service';
import { OperationSightingInvalidationDialogData } from './operation-sighting-invalidation-dialog.type';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
    selector: 'app-operation-sighting-invalidation-dialog',
    templateUrl: './operation-sighting-invalidation-dialog.component.html',
    styleUrl: './operation-sighting-invalidation-dialog.component.scss',
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
export class OperationSightingInvalidationDialogComponent {
    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #operationSightingInvalidationDialogService = inject(
        OperationSightingInvalidationDialogService,
    );

    readonly form = this.#fb.group({
        reason: this.#fb.control('', [Validators.required]),
    });

    constructor(
        @Inject(MAT_DIALOG_DATA)
        private readonly data: OperationSightingInvalidationDialogData,
    ) {}

    onClickClose(): void {
        this.#operationSightingInvalidationDialogService.close();
    }

    async onClickSubmit(): Promise<void> {
        const { reason } = this.form.value;

        const result = await tryCatchAsync(
            this.#operationSightingInvalidationDialogService.invalidate(reason),
            (e) => e as HttpErrorResponse,
        );

        if (result.isFailure()) {
            console.error('Invalidate failed:', result.error.error);

            this.#snackBar.open('無効化に失敗しました', '閉じる', {
                duration: 3000,
            });

            return;
        }

        this.#snackBar.open('無効化が完了しました', '閉じる', {
            duration: 3000,
        });

        this.#operationSightingInvalidationDialogService.close(true);
    }
}
