import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';
import { ConfirmDialogHeaderPComponent } from '../confirm-dialog-header-p/confirm-dialog-header-p.component';

@Component({
    selector: 'app-confirm-dialog-header-c',
    templateUrl: './confirm-dialog-header-c.component.html',
    styleUrls: ['./confirm-dialog-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ConfirmDialogHeaderPComponent]
})
export class ConfirmDialogHeaderCComponent {
    readonly #confirmDialogService = inject(ConfirmDialogService);
    readonly #confirmDialogStateQuery = inject(ConfirmDialogStateQuery);

    readonly data = toSignal(this.#confirmDialogStateQuery.data$);

    onReceiveClickClose(): void {
        this.#confirmDialogService.close();
    }
}
