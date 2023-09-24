import { NgModule } from '@angular/core';
import { TIMETABLE_EDIT_FORM_DECLARATIONS } from './timetable-edit-form.declaration';
import { TIMETABLE_EDIT_FORM_PROVIDERS } from './timetable-edit-form.provider';

@NgModule({
    providers: [...TIMETABLE_EDIT_FORM_PROVIDERS],
    imports: [...TIMETABLE_EDIT_FORM_DECLARATIONS],
    exports: [...TIMETABLE_EDIT_FORM_DECLARATIONS],
})
export class TimetableEditFormModule {}
