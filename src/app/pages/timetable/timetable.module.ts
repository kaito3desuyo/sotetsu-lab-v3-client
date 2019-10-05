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
import { TimetableAllLinePaginatorContainerComponent } from './general/components/timetable-all-line-paginator-container/timetable-all-line-paginator-container.component';
import { TimetableAllLinePaginatorPresentationalComponent } from './general/components/timetable-all-line-paginator-presentational/timetable-all-line-paginator-presentational.component';
import { MatPaginatorModule } from '@angular/material/paginator';
import { TimetableAllLineHeaderContainerComponent } from './general/components/timetable-all-line-header-container/timetable-all-line-header-container.component';
import { TimetableAllLineHeaderPresentationalComponent } from './general/components/timetable-all-line-header-presentational/timetable-all-line-header-presentational.component';
import { MatToolbarModule } from '@angular/material/toolbar';

@NgModule({
  imports: [
    CommonModule,
    TimetableRoutingModule,
    FlexLayoutModule,
    MatCardModule,
    MatPaginatorModule,
    MatToolbarModule
  ],
  declarations: [
    TimetableAllLineComponent,
    TimetableAllLineHeaderContainerComponent,
    TimetableAllLineHeaderPresentationalComponent,
    TimetableAllLineTableContainerComponent,
    TimetableAllLineTablePresentationalComponent,
    TimetableAllLinePaginatorContainerComponent,
    TimetableAllLinePaginatorPresentationalComponent
  ],
  providers: [TimetableAllLineService, TimetableAllLineTableResolverService]
})
export class TimetableModule {}
