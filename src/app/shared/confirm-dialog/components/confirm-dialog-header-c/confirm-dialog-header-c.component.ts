import { Component } from '@angular/core';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';

@Component({
    selector: 'app-confirm-dialog-header-c',
    templateUrl: './confirm-dialog-header-c.component.html',
    styleUrls: ['./confirm-dialog-header-c.component.scss'],
})
export class ConfirmDialogHeaderCComponent {
    readonly data$ = this.confirmDialogStateQuery.data$;

    constructor(
        private readonly confirmDialogService: ConfirmDialogService,
        private readonly confirmDialogStateQuery: ConfirmDialogStateQuery
    ) {}

    onReceiveClickClose(): void {
        this.confirmDialogService.close();
    }
}
