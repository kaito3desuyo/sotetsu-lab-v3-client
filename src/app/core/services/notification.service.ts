import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    readonly #snackBar = inject(MatSnackBar);

    open(message: string, action: string) {
        this.#snackBar.open(message, action, {
            duration: 3000,
        });
    }
}
