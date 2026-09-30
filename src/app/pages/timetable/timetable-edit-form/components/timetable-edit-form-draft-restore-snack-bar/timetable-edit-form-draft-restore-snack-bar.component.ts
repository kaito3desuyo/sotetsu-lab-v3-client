import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
    MatSnackBarAction,
    MatSnackBarActions,
    MatSnackBarLabel,
    MatSnackBarRef,
} from '@angular/material/snack-bar';

/**
 * 下書きの復元の案内。自動では消さないので「閉じる」も置く。
 * 「復元する」は dismissWithAction → 開いた側の onAction で復元する。
 */
@Component({
    selector: 'app-timetable-edit-form-draft-restore-snack-bar',
    templateUrl: './timetable-edit-form-draft-restore-snack-bar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatSnackBarLabel,
        MatSnackBarActions,
        MatSnackBarAction,
    ],
})
export class TimetableEditFormDraftRestoreSnackBarComponent {
    readonly snackBarRef = inject(MatSnackBarRef);
}
