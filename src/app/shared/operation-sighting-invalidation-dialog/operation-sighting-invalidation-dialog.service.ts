import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OperationSightingInvalidationDialogComponent } from './operation-sighting-invalidation-dialog.component';
import { OperationSightingInvalidationDialogData } from './operation-sighting-invalidation-dialog.type';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { Observable } from 'rxjs';
import { UserStateQuery } from 'src/app/global-states/user.state';

@Injectable({
    providedIn: 'root',
})
export class OperationSightingInvalidationDialogService {
    readonly #dialog = inject(MatDialog);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #userQuery = inject(UserStateQuery);

    #data: OperationSightingInvalidationDialogData;
    #dialogRef: MatDialogRef<
        OperationSightingInvalidationDialogComponent,
        boolean
    >;

    open(
        data: OperationSightingInvalidationDialogData,
    ): MatDialogRef<OperationSightingInvalidationDialogComponent> {
        this.#data = data;
        this.#dialogRef = this.#dialog.open<
            OperationSightingInvalidationDialogComponent,
            OperationSightingInvalidationDialogData,
            boolean
        >(OperationSightingInvalidationDialogComponent, {
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

    invalidate(reason: string): Observable<void> {
        const operationSightingId = this.#data.operationSightingId;
        const userId = this.#userQuery.userId;

        return this.#operationSightingService.invalidate({
            operationSightingId,
            userId,
            reason,
        });
    }
}
