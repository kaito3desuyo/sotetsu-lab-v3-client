import { Provider } from '@angular/core';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import {
    TimetableEditFormStateQuery,
    TimetableEditFormStateStore,
} from './states/timetable-edit-form.state';

export const TIMETABLE_EDIT_FORM_PROVIDERS: Provider[] = [
    TimetableEditFormService,
    TimetableEditFormStateStore,
    TimetableEditFormStateQuery,
];
