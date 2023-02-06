import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyCardModule as MatCardModule } from '@angular/material/legacy-card';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyPaginatorModule as MatPaginatorModule } from '@angular/material/legacy-paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { LetModule } from '@rx-angular/template';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { AppSharedModule } from 'src/app/shared/app-shared/app-shared.module';
import { ConfirmDialogModule } from 'src/app/shared/confirm-dialog/confirm-dialog.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableAllLineHeaderCComponent } from './components/timetable-all-line-header-c/timetable-all-line-header-c.component';
import { TimetableAllLineHeaderPComponent } from './components/timetable-all-line-header-p/timetable-all-line-header-p.component';
import { TimetableAllLineMainCComponent } from './components/timetable-all-line-main-c/timetable-all-line-main-c.component';
import { TimetableAllLineTableCComponent } from './components/timetable-all-line-table-c/timetable-all-line-table-c.component';
import { TimetableAllLineTablePComponent } from './components/timetable-all-line-table-p/timetable-all-line-table-p.component';
import { TimetableAllLineGetStationNumberingPipe } from './pipes/timetable-all-line-get-station-numbering.pipe';
import {
    TimetableAllLineGetTimeAndTrackByPipe,
    TimetableAllLineGetTimePipe,
} from './pipes/timetable-all-line-get-time.pipe';
import { TimetableAllLineResolverService } from './services/timetable-all-line-resolver.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from './states/timetable-all-line.state';
import { TimetableAllLineRoutingModule } from './timetable-all-line-routing.module';
import { TimetableAllLineComponent } from './timetable-all-line.component';
import { TimetableAllLineGetViewModePipe } from './pipes/timetable-all-line-get-view-mode.pipe';
import { TimetableAllLineGetBorderSettingPipe } from './pipes/timetable-all-line-get-border-setting.pipe';
import { CalendarSelectDialogModule } from 'src/app/shared/calendar-select-dialog/calendar-select-dialog.module';

@NgModule({
    declarations: [
        TimetableAllLineComponent,
        TimetableAllLineHeaderCComponent,
        TimetableAllLineHeaderPComponent,
        TimetableAllLineMainCComponent,
        TimetableAllLineTableCComponent,
        TimetableAllLineTablePComponent,
        TimetableAllLineGetTimePipe,
        TimetableAllLineGetTimeAndTrackByPipe,
        TimetableAllLineGetStationNumberingPipe,
        TimetableAllLineGetViewModePipe,
        TimetableAllLineGetBorderSettingPipe,
    ],
    providers: [
        TimetableAllLineService,
        TimetableAllLineResolverService,
        TimetableAllLineStateStore,
        TimetableAllLineStateQuery,
    ],
    imports: [
        CommonModule,
        FlexLayoutModule,
        MatCardModule,
        MatPaginatorModule,
        MatToolbarModule,
        MatTooltipModule,
        MatButtonModule,
        MatIconModule,
        LetModule,
        TimetableAllLineRoutingModule,
        AppSharedModule,
        AdsenseModule,
        PipesModule,
        TimetableSearchCardModule,
        ConfirmDialogModule,
        CalendarSelectDialogModule,
    ],
})
export class TimetableAllLineModule {}
