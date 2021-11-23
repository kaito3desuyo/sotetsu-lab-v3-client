import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
