import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TimetableEditFormModule } from 'src/app/shared/timetable-edit-form/timetable-edit-form.module';
import { TimetableUpdateHeaderCComponent } from './components/timetable-update-header-c/timetable-update-header-c.component';
import { TimetableUpdateHeaderPComponent } from './components/timetable-update-header-p/timetable-update-header-p.component';
import { TimetableUpdateMainCComponent } from './components/timetable-update-main-c/timetable-update-main-c.component';
import { TimetableUpdateResolverService } from './services/timetable-update-resolver.service';
import { TimetableUpdateService } from './services/timetable-update.service';
import { TimetableUpdateRoutingModule } from './timetable-update-routing.module';
import { TimetableUpdateComponent } from './timetable-update.component';

@NgModule({
    declarations: [
        TimetableUpdateComponent,
        TimetableUpdateHeaderCComponent,
        TimetableUpdateHeaderPComponent,
        TimetableUpdateMainCComponent,
    ],
    providers: [TimetableUpdateService, TimetableUpdateResolverService],
    imports: [
        CommonModule,
        FlexLayoutModule,
        TimetableUpdateRoutingModule,
        TimetableEditFormModule,
    ],
})
export class TimetableUpdateModule {}
