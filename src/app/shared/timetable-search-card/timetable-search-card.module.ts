import { NgModule } from '@angular/core';
import { TimetableSearchCardCComponent } from './components/timetable-search-card-c/timetable-search-card-c.component';
import { TimetableSearchCardService } from './services/timetable-search-card.service';
import {
    TimetableSearchCardStateQuery,
    TimetableSearchCardStateStore,
} from './states/timetable-search-card.state';

@NgModule({
    providers: [
        TimetableSearchCardService,
        TimetableSearchCardStateStore,
        TimetableSearchCardStateQuery,
    ],
    imports: [TimetableSearchCardCComponent],
    exports: [TimetableSearchCardCComponent],
})
export class TimetableSearchCardModule {}
