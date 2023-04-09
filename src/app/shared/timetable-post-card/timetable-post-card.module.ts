import { NgModule } from '@angular/core';
import { TimetablePostCardCComponent } from './components/timetable-post-card-c/timetable-post-card-c.component';
import { TimetablePostCardPComponent } from './components/timetable-post-card-p/timetable-post-card-p.component';
import { TIMETABLE_POST_CARD_PROVIDERS } from './timetable-post-card.provider';

@NgModule({
    providers: TIMETABLE_POST_CARD_PROVIDERS,
    imports: [TimetablePostCardCComponent, TimetablePostCardPComponent],
    exports: [TimetablePostCardCComponent],
})
export class TimetablePostCardModule {}
