import { Provider } from '@angular/core';
import { TimetableSearchCardService } from './services/timetable-search-card.service';
import {
    TimetableSearchCardStateStore,
    TimetableSearchCardStateQuery,
} from './states/timetable-search-card.state';

export const TIMETABLE_SEARCH_CARD_PROVIDERS: Provider[] = [
    TimetableSearchCardService,
    TimetableSearchCardStateStore,
    TimetableSearchCardStateQuery,
];
