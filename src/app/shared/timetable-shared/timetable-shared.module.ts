import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TimetableSearchFormContainerComponent } from './components/timetable-search-form-container/timetable-search-form-container.component';
import { TimetableSearchFormPresentationalComponent } from './components/timetable-search-form-presentational/timetable-search-form-presentational.component';
import { MatRadioModule } from '@angular/material/radio';
import { TimetableSearchFormService } from './services/timetable-search-form.service';
import { TimetableSearchFormResolverService } from './services/timetable-search-form-resolver.service';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  exports: [TimetableSearchFormContainerComponent],
  declarations: [
    TimetableSearchFormContainerComponent,
    TimetableSearchFormPresentationalComponent
  ],
  providers: [TimetableSearchFormService, TimetableSearchFormResolverService]
})
export class TimetableSharedModule {}
