import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmDialogHeaderCComponent } from './components/confirm-dialog-header-c/confirm-dialog-header-c.component';
import { ConfirmDialogHeaderPComponent } from './components/confirm-dialog-header-p/confirm-dialog-header-p.component';
import { ConfirmDialogMainCComponent } from './components/confirm-dialog-main-c/confirm-dialog-main-c.component';
import { ConfirmDialogMainPComponent } from './components/confirm-dialog-main-p/confirm-dialog-main-p.component';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { ConfirmDialogService } from './services/confirm-dialog.service';

@NgModule({
    declarations: [
        ConfirmDialogComponent,
        ConfirmDialogHeaderCComponent,
        ConfirmDialogHeaderPComponent,
        ConfirmDialogMainCComponent,
        ConfirmDialogMainPComponent,
    ],
    providers: [ConfirmDialogService],
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class ConfirmDialogModule {}
