import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
    ModerationConfirmDialogData,
    ModerationConfirmDialogResult,
} from './moderation-confirm-dialog.type';

/** 理由の長さ（api の 1〜200 字）。前後の空白は送る前に除くので、除いたあとで数える */
export const MODERATION_REASON_MAX_LENGTH = 200;

function reasonValidator(required: boolean): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
        const length = (control.value ?? '').trim().length;
        if (length > MODERATION_REASON_MAX_LENGTH) {
            return { maxlength: true };
        }
        return required && length === 0 ? { required: true } : null;
    };
}

@Component({
    selector: 'app-moderation-confirm-dialog',
    templateUrl: './moderation-confirm-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
    ],
})
export class ModerationConfirmDialogComponent {
    readonly #dialogRef =
        inject<
            MatDialogRef<
                ModerationConfirmDialogComponent,
                ModerationConfirmDialogResult | undefined
            >
        >(MatDialogRef);
    readonly data = inject<ModerationConfirmDialogData>(MAT_DIALOG_DATA);
    readonly #fb = inject(FormBuilder);

    readonly maxLength = MODERATION_REASON_MAX_LENGTH;
    readonly form = this.#fb.nonNullable.group({
        reason: this.#fb.nonNullable.control('', [
            reasonValidator(this.data.reasonRequired),
        ]),
    });

    onCancel(): void {
        this.#dialogRef.close(undefined);
    }

    onSubmit(): void {
        if (this.form.invalid) {
            return;
        }
        this.#dialogRef.close({
            reason: this.form.getRawValue().reason.trim(),
        });
    }
}
