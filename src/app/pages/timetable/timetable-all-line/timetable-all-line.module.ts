import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableSharedModule } from 'src/app/shared/timetable-shared/timetable-shared.module';
import { TimetableAllLineHeaderCComponent } from './components/timetable-all-line-header-c/timetable-all-line-header-c.component';
import { TimetableAllLineHeaderPComponent } from './components/timetable-all-line-header-p/timetable-all-line-header-p.component';
import { TimetableAllLineMainCComponent } from './components/timetable-all-line-main-c/timetable-all-line-main-c.component';
import { TimetableAllLineTableCComponent } from './components/timetable-all-line-table-c/timetable-all-line-table-c.component';
import { TimetableAllLineTablePComponent } from './components/timetable-all-line-table-p/timetable-all-line-table-p.component';
import { TimetableAllLineGetTimePipe } from './pipes/timetable-all-line-get-time.pipe';
import { TimetableAllLineResolverService } from './services/timetable-all-line-resolver.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from './states/timetable-all-line.state';
import { TimetableAllLineRoutingModule } from './timetable-all-line-routing.module';
import { TimetableAllLineComponent } from './timetable-all-line.component';
import { TimetableAllLineGetStationNumberingPipe } from './pipes/timetable-all-line-get-station-numbering.pipe';

@NgModule({
    imports: [
        CommonModule,
        FlexLayoutModule,
        MatCardModule,
        MatPaginatorModule,
        MatToolbarModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        TimetableAllLineRoutingModule,
        AppSharedModule,
        TimetableSharedModule,
        AdsenseModule,
        PipesModule,
        TimetableSearchCardModule,
    ],
    declarations: [
        TimetableAllLineComponent,
        TimetableAllLineHeaderCComponent,
        TimetableAllLineHeaderPComponent,
        TimetableAllLineMainCComponent,
        TimetableAllLineTableCComponent,
        TimetableAllLineTablePComponent,
        TimetableAllLineGetTimePipe,
        TimetableAllLineGetStationNumberingPipe,
    ],
    providers: [
        TimetableAllLineService,
        TimetableAllLineResolverService,
        TimetableAllLineStateStore,
        TimetableAllLineStateQuery,
    ],
})
export class TimetableAllLineModule {}
