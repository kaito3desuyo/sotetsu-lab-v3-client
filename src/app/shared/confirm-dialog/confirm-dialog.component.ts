import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
    viewChild,
} from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { wait } from 'src/app/core/utils/wait';
import { IConfirmDialogData } from './interfaces/confirm-dialog-data.interface';

@Component({
    selector: 'app-confirm-dialog',
    templateUrl: './confirm-dialog.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
})
export class ConfirmDialogComponent implements OnInit {
    readonly #dialogRef =
        inject<MatDialogRef<ConfirmDialogComponent, boolean>>(MatDialogRef);

    readonly data = inject<IConfirmDialogData>(MAT_DIALOG_DATA);

    private readonly cancelButton =
        viewChild.required<MatButton>('cancelButton');
    private readonly goButton = viewChild.required<MatButton>('goButton');

    async ngOnInit(): Promise<void> {
        await wait(0);
        if (this.data.goButtonColor === 'warn') {
            this.cancelButton().focus();
        } else {
            this.goButton().focus();
        }
    }

    close(bool: boolean): void {
        this.#dialogRef.close(bool);
    }
}
