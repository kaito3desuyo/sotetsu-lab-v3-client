import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AdsenseModule } from 'ng2-adsense';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { TimetableSearchCardModule } from 'src/app/shared/timetable-search-card/timetable-search-card.module';
import { TimetableStationHeaderCComponent } from './components/timetable-station-header-c/timetable-station-header-c.component';
import { TimetableStationHeaderPComponent } from './components/timetable-station-header-p/timetable-station-header-p.component';
import { TimetableStationMainCComponent } from './components/timetable-station-main-c/timetable-station-main-c.component';
import { TimetableStationTablePComponent } from './components/timetable-station-table-p/timetable-station-table-p.component';
import { TimetableStationFindLastStopStationPipe } from './pipes/timetable-station-find-last-stop-station.pipe';
import { TimetableStationFindOtherTripsInSameTripBlockPipe } from './pipes/timetable-station-find-other-trips-in-same-trip-block.pipe';
import { TimetableStationResolverService } from './services/timetable-station-resolver.service';
import { TimetableStationService } from './services/timetable-station.service';
import {
    TimetableStationStateQuery,
    TimetableStationStateStore,
} from './states/timetable-station.state';
import { TimetableStationRoutingModule } from './timetable-station-routing.module';
import { TimetableStationComponent } from './timetable-station.component';

@NgModule({
    imports: [
        TimetableStationRoutingModule,
        CommonModule,
        MatCardModule,
        MatToolbarModule,
        MatRippleModule,
        AdsenseModule,
        PipesModule,
        TimetableSearchCardModule,
        RxLet,
        RxFor,
        RxIf,
    ],
    declarations: [
        TimetableStationComponent,
        TimetableStationHeaderCComponent,
        TimetableStationHeaderPComponent,
        TimetableStationMainCComponent,
        TimetableStationTablePComponent,
        TimetableStationFindLastStopStationPipe,
        TimetableStationFindOtherTripsInSameTripBlockPipe,
    ],
    providers: [
        TimetableStationService,
        TimetableStationResolverService,
        TimetableStationStateStore,
        TimetableStationStateQuery,
    ],
})
export class TimetableStationModule {}
