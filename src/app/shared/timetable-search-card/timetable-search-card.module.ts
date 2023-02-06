import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatLegacyRadioModule as MatRadioModule } from '@angular/material/legacy-radio';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacySlideToggleModule as MatSlideToggleModule } from '@angular/material/legacy-slide-toggle';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { TimetableSearchCardCComponent } from './components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardPComponent } from './components/timetable-search-card-p/timetable-search-card-p.component';
import { TimetableSearchCardService } from './services/timetable-search-card.service';
import {
    TimetableSearchCardStateQuery,
    TimetableSearchCardStateStore,
} from './states/timetable-search-card.state';

@NgModule({
    declarations: [
        TimetableSearchCardCComponent,
        TimetableSearchCardPComponent,
    ],
    providers: [
        TimetableSearchCardService,
        TimetableSearchCardStateStore,
        TimetableSearchCardStateQuery,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        MatRadioModule,
        MatButtonModule,
        PipesModule,
    ],
    exports: [TimetableSearchCardCComponent],
})
export class TimetableSearchCardModule {}
