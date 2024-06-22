import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarSelectDialogHeaderCComponent } from './components/calendar-select-dialog-header-c/calendar-select-dialog-header-c.component';
import { CalendarSelectDialogHeaderPComponent } from './components/calendar-select-dialog-header-p/calendar-select-dialog-header-p.component';
import { CalendarSelectDialogMainCComponent } from './components/calendar-select-dialog-main-c/calendar-select-dialog-main-c.component';
import { CalendarSelectDialogMainPComponent } from './components/calendar-select-dialog-main-p/calendar-select-dialog-main-p.component';
import { CalendarSelectDialogComponent } from './components/calendar-select-dialog/calendar-select-dialog.component';
import { CalendarSelectDialogService } from './services/calendar-select-dialog.service';

@NgModule({
    declarations: [
        CalendarSelectDialogComponent,
        CalendarSelectDialogHeaderCComponent,
        CalendarSelectDialogHeaderPComponent,
        CalendarSelectDialogMainCComponent,
        CalendarSelectDialogMainPComponent,
    ],
    providers: [CalendarSelectDialogService],
    imports: [
        CommonModule,
        FormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        PipesModule,
    ],
})
export class CalendarSelectDialogModule {}
