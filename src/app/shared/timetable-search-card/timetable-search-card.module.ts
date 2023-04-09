import { NgModule } from '@angular/core';
import TIMETABLE_SEARCH_CARD_DECLARATIONS from './timetable-search-card.declaration';
import TIMETABLE_SEARCH_CARD_PROVIDERS from './timetable-search-card.provider';

@NgModule({
    providers: [...TIMETABLE_SEARCH_CARD_PROVIDERS],
    imports: [...TIMETABLE_SEARCH_CARD_DECLARATIONS],
    exports: [...TIMETABLE_SEARCH_CARD_DECLARATIONS],
})
export class TimetableSearchCardModule {}
