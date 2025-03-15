import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';
import { ConfirmDialogMainPComponent } from '../confirm-dialog-main-p/confirm-dialog-main-p.component';

@Component({
    selector: 'app-confirm-dialog-main-c',
    templateUrl: './confirm-dialog-main-c.component.html',
    styleUrls: ['./confirm-dialog-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ConfirmDialogMainPComponent, CommonModule]
})
export class ConfirmDialogMainCComponent {
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #confirmDialogStateQuery = inject(ConfirmDialogStateQuery);

    readonly data = toSignal(this.#confirmDialogStateQuery.data$);

    onReceiveClickButton(bool: boolean): void {
        this.#confirmDialogService.close(bool);
    }
}
