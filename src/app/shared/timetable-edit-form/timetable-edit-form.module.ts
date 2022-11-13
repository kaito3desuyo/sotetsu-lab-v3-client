import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { LetModule } from '@rx-angular/template';
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
        FlexLayoutModule,
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
        LetModule,
        PipesModule,
    ],
    exports: [TimetableEditFormCComponent],
})
export class TimetableEditFormModule {}
