import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TimetableEditFormModule } from 'src/app/shared/timetable-edit-form/timetable-edit-form.module';
import { TimetableCopyHeaderCComponent } from './components/timetable-copy-header-c/timetable-copy-header-c.component';
import { TimetableCopyHeaderPComponent } from './components/timetable-copy-header-p/timetable-copy-header-p.component';
import { TimetableCopyMainCComponent } from './components/timetable-copy-main-c/timetable-copy-main-c.component';
import { TimetableCopyResolverService } from './services/timetable-copy-resolver.service';
import { TimetableCopyService } from './services/timetable-copy.service';
import { TimetableCopyRoutingModule } from './timetable-copy-routing.module';
import { TimetableCopyComponent } from './timetable-copy.component';

@NgModule({
    declarations: [
        TimetableCopyComponent,
        TimetableCopyHeaderCComponent,
        TimetableCopyHeaderPComponent,
        TimetableCopyMainCComponent,
    ],
    providers: [TimetableCopyService, TimetableCopyResolverService],
    imports: [
        CommonModule,
        TimetableCopyRoutingModule,
        TimetableEditFormModule,
    ],
})
export class TimetableCopyModule {}
