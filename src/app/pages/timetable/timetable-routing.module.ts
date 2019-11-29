import { Routes, RouterModule } from '@angular/router';
import { TimetableAllLineComponent } from './timetable-all-line/timetable-all-line.component';
import { NgModule } from '@angular/core';
import { TimetableAllLineTableResolverService } from './general/services/timetable-all-line-table-resolver.service';
import { TimetableAddComponent } from './timetable-add/timetable-add.component';
import { TimetableAddResolverService } from './general/services/timetable-add-resolver.service';
import { TimetableUpdateComponent } from './timetable-update/timetable-update.component';
import { TimetableUpdateResolverService } from './general/services/timetable-update-resolver.service';
import { TimetableStationComponent } from './timetable-station/timetable-station.component';
import { TimetableStationResolverService } from './general/services/timetable-station-resolver.service';
import { TimetableSearchFormResolverService } from 'src/app/shared/timetable-shared/services/timetable-search-form-resolver.service';

const routes: Routes = [
    {
        path: ':calendarId/all-line',
        component: TimetableAllLineComponent,
        resolve: {
            timetableAllLine: TimetableAllLineTableResolverService,
            from2: TimetableSearchFormResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '全線時刻表'
        }
    },
    {
        path: ':calendarId/station/:stationId',
        component: TimetableStationComponent,
        resolve: {
            from: TimetableStationResolverService,
            from2: TimetableSearchFormResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '駅別時刻表'
        }
    },
    {
        path: 'add/:calendarId',
        component: TimetableAddComponent,
        resolve: {
            from: TimetableAddResolverService
        },
        data: {
            title: '列車を追加する'
        }
    },
    {
        path: 'update/:blockId',
        component: TimetableUpdateComponent,
        resolve: {
            from: TimetableUpdateResolverService
        },
        data: {
            title: '列車を編集する'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TimetableRoutingModule {}
