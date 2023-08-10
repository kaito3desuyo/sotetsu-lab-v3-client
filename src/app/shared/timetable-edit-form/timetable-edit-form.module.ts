import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyCheckboxModule as MatCheckboxModule } from '@angular/material/legacy-checkbox';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { TimetableEditFormCComponent } from './components/timetable-edit-form-c/timetable-edit-form-c.component';
import { TimetableEditFormPComponent } from './components/timetable-edit-form-p/timetable-edit-form-p.component';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from './states/timetable-edit-form.state';

@NgModule({
    declarations: [TimetableEditFormCComponent, TimetableEditFormPComponent],
    providers: [
        TimetableEditFormService,
        TimetableEditFormStateStore,
        TimetableEditFormStateQuery,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatToolbarModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatButtonModule,
        MatSlideToggleModule,
        MatIconModule,
        RxLet,
        RxFor,
        RxIf,
        PipesModule,
    ],
    exports: [TimetableEditFormCComponent],
})
export class TimetableEditFormModule {}
