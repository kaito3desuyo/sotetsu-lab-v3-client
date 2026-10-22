import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
    OperationPostFormComponent,
    OperationPostInitialValue,
} from '../operation-post-card/operation-post-form.component';

/** リアルタイム運用情報の投稿ダイアログ（右下の投稿ボタン・行の投稿ボタンから開く。2026-10-22） */
@Component({
    selector: 'app-operation-post-dialog',
    template: `
        <section class="tw-flex tw-flex-col tw-gap-4 tw-p-6">
            <header
                class="tw-flex tw-flex-row tw-items-center tw-justify-between"
            >
                <h2 class="mat-h2 !tw-m-0">運用情報を投稿する</h2>
                <button
                    mat-icon-button
                    type="button"
                    aria-label="投稿ダイアログを閉じる"
                    (click)="close()"
                >
                    <mat-icon>clear</mat-icon>
                </button>
            </header>
            <app-operation-post-form
                [initialValue]="data"
                (submitted)="close()"
            ></app-operation-post-form>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule, OperationPostFormComponent],
})
export class OperationPostDialogComponent {
    readonly #dialogRef = inject(MatDialogRef<OperationPostDialogComponent>);
    readonly data: OperationPostInitialValue =
        inject<OperationPostInitialValue | null>(MAT_DIALOG_DATA) ?? {};

    close(): void {
        this.#dialogRef.close();
    }
}
