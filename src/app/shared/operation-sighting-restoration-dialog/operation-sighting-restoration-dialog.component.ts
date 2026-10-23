import { FetchError } from 'src/app/core/classes/custom-error';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationSightingRestorationDialogData } from './operation-sighting-restoration-dialog.type';

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
    readonly #dialogRef =
        inject<
            MatDialogRef<OperationSightingRestorationDialogComponent, boolean>
        >(MatDialogRef);
    readonly #data =
        inject<OperationSightingRestorationDialogData>(MAT_DIALOG_DATA);

    readonly #fb = inject(FormBuilder);
    readonly #snackBar = inject(MatSnackBar);
    readonly #operationSightingService = inject(OperationSightingService);

    readonly form = this.#fb.group({
        reason: this.#fb.control('', [Validators.required]),
    });

    onClickClose(): void {
        this.#dialogRef.close(false);
    }

    async onClickSubmit(): Promise<void> {
        const { reason } = this.form.value;

        const result = await tryCatchAsync(
            this.#operationSightingService.restore({
                operationSightingId: this.#data.operationSightingId,
                reason,
            }),
            (e) => e as FetchError,
        );

        if (result.isFailure()) {
            console.error('Invalidate failed:', result.error.body);

            this.#snackBar.open('復元に失敗しました。', '閉じる', {
                duration: 3000,
            });

            return;
        }

        this.#snackBar.open('復元に成功しました。', '閉じる', {
            duration: 3000,
        });

        this.#dialogRef.close(true);
    }
}
