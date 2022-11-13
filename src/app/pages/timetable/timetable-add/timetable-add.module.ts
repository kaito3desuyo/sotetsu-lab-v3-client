import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { TimetableEditFormModule } from 'src/app/shared/timetable-edit-form/timetable-edit-form.module';
import { TimetableAddResolverService } from './services/timetable-add-resolver.service';
import { TimetableAddRoutingModule } from './timetable-add-routing.module';
import { TimetableAddComponent } from './timetable-add.component';
import { TimetableAddHeaderCComponent } from './components/timetable-add-header-c/timetable-add-header-c.component';
import { TimetableAddHeaderPComponent } from './components/timetable-add-header-p/timetable-add-header-p.component';
import { TimetableAddMainCComponent } from './components/timetable-add-main-c/timetable-add-main-c.component';
import { TimetableAddService } from './services/timetable-add.service';

@NgModule({
    declarations: [
        TimetableAddComponent,
        TimetableAddHeaderCComponent,
        TimetableAddHeaderPComponent,
        TimetableAddMainCComponent,
    ],
    providers: [TimetableAddService, TimetableAddResolverService],
    imports: [
        CommonModule,
        FlexLayoutModule,
        TimetableAddRoutingModule,
        TimetableEditFormModule,
    ],
})
export class TimetableAddModule {}
