import { Injectable } from '@angular/core';
import { MatLegacySnackBar as MatSnackBar } from '@angular/material/legacy-snack-bar';

@Injectable({
    providedIn: 'root',
})
export class NotificationService {
    constructor(private snackBar: MatSnackBar) {}

    open(message: string, action: string) {
        this.snackBar.open(message, action, {
            duration: 3000,
        });
    }
}
