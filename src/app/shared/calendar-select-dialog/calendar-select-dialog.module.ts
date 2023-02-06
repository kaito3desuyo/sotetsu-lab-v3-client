import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarSelectDialogComponent } from './components/calendar-select-dialog/calendar-select-dialog.component';
import { CalendarSelectDialogHeaderCComponent } from './components/calendar-select-dialog-header-c/calendar-select-dialog-header-c.component';
import { CalendarSelectDialogHeaderPComponent } from './components/calendar-select-dialog-header-p/calendar-select-dialog-header-p.component';
import { CalendarSelectDialogMainCComponent } from './components/calendar-select-dialog-main-c/calendar-select-dialog-main-c.component';
import { CalendarSelectDialogMainPComponent } from './components/calendar-select-dialog-main-p/calendar-select-dialog-main-p.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { CalendarSelectDialogService } from './services/calendar-select-dialog.service';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { PipesModule } from 'src/app/core/pipes/pipes.module';

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
        FlexLayoutModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        PipesModule,
    ],
})
export class CalendarSelectDialogModule {}
