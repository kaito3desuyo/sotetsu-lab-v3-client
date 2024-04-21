import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TimetableEditFormModule } from 'src/app/shared/timetable-edit-form/timetable-edit-form.module';
import { TimetableAddHeaderCComponent } from './components/timetable-add-header-c/timetable-add-header-c.component';
import { TimetableAddHeaderPComponent } from './components/timetable-add-header-p/timetable-add-header-p.component';
import { TimetableAddMainCComponent } from './components/timetable-add-main-c/timetable-add-main-c.component';
import { TimetableAddResolverService } from './services/timetable-add-resolver.service';
import { TimetableAddService } from './services/timetable-add.service';
import { TimetableAddRoutingModule } from './timetable-add-routing.module';
import { TimetableAddComponent } from './timetable-add.component';

@NgModule({
    declarations: [
        TimetableAddComponent,
        TimetableAddHeaderCComponent,
        TimetableAddHeaderPComponent,
        TimetableAddMainCComponent,
    ],
    providers: [TimetableAddService, TimetableAddResolverService],
    imports: [CommonModule, TimetableAddRoutingModule, TimetableEditFormModule],
})
export class TimetableAddModule {}
