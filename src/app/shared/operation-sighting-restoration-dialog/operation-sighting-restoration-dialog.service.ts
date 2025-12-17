import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationSightingRestorationDialogComponent } from './operation-sighting-restoration-dialog.component';
import { OperationSightingRestorationDialogData } from './operation-sighting-restoration-dialog.type';

@Injectable({
    providedIn: 'root',
})
export class OperationSightingRestorationDialogService {
    readonly #dialog = inject(MatDialog);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #userQuery = inject(UserStateQuery);

    #data: OperationSightingRestorationDialogData;
    #dialogRef: MatDialogRef<
        OperationSightingRestorationDialogComponent,
        boolean
    >;

    open(
        data: OperationSightingRestorationDialogData,
    ): MatDialogRef<OperationSightingRestorationDialogComponent> {
        this.#data = data;
        this.#dialogRef = this.#dialog.open<
            OperationSightingRestorationDialogComponent,
            OperationSightingRestorationDialogData,
            boolean
        >(OperationSightingRestorationDialogComponent, {
            width: '360px',
            autoFocus: false,
            disableClose: true,
            data,
        });

        return this.#dialogRef;
    }

    close(bool = false): void {
        if (this.#dialogRef) {
            this.#dialogRef.close(bool);
        }
    }

    restore(reason: string): Observable<void> {
        const operationSightingId = this.#data.operationSightingId;
        const userId = this.#userQuery.userId;

        return this.#operationSightingService.restore({
            operationSightingId,
            userId,
            reason,
        });
    }
}
