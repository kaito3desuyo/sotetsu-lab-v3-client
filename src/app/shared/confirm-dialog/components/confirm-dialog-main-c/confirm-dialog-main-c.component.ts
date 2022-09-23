import { Component, OnInit } from '@angular/core';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogStateQuery } from '../../states/confirm-dialog.state';

@Component({
    selector: 'app-confirm-dialog-main-c',
    templateUrl: './confirm-dialog-main-c.component.html',
    styleUrls: ['./confirm-dialog-main-c.component.scss'],
})
export class ConfirmDialogMainCComponent {
    readonly data$ = this.confirmDialogStateQuery.data$;

    constructor(
        private readonly confirmDialogService: ConfirmDialogService,
        private readonly confirmDialogStateQuery: ConfirmDialogStateQuery
    ) {}

    onReceiveClickButton(bool: boolean): void {
        this.confirmDialogService.close(bool);
    }
}
