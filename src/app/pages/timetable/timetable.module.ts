import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimetableRoutingModule } from './timetable-routing.module';
import { TimetableAllLineComponent } from './timetable-all-line/timetable-all-line.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { TimetableAllLineTableContainerComponent } from './general/components/timetable-all-line-table-container/timetable-all-line-table-container.component';
import { TimetableAllLineTablePresentationalComponent } from './general/components/timetable-all-line-table-presentational/timetable-all-line-table-presentational.component';
import { TimetableAllLineService } from './general/services/timetable-all-line.service';
import { TimetableAllLineTableResolverService } from './general/services/timetable-all-line-table-resolver.service';

@NgModule({
  imports: [
    CommonModule,
    TimetableRoutingModule,
    FlexLayoutModule,
    MatCardModule
  ],
  declarations: [
    TimetableAllLineComponent,
    TimetableAllLineTableContainerComponent,
    TimetableAllLineTablePresentationalComponent
  ],
  providers: [TimetableAllLineService, TimetableAllLineTableResolverService]
})
export class TimetableModule {}
