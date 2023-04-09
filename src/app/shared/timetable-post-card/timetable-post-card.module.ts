import { NgModule } from '@angular/core';
import TIMETABLE_POST_CARD_DECLARATIONS from './timetable-post-card.declaration';
import TIMETABLE_POST_CARD_PROVIDERS from './timetable-post-card.provider';

@NgModule({
    providers: [...TIMETABLE_POST_CARD_PROVIDERS],
    imports: [...TIMETABLE_POST_CARD_DECLARATIONS],
    exports: [...TIMETABLE_POST_CARD_DECLARATIONS],
})
export class TimetablePostCardModule {}
