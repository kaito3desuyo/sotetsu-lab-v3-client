import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimetableStationResolverService } from './services/timetable-station-resolver.service';
import { TimetableStationComponent } from './timetable-station.component';

const routes: Routes = [
    {
        path: '',
        component: TimetableStationComponent,
        resolve: {
            from: TimetableStationResolverService,
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '駅別時刻表',
        },
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TimetableStationRoutingModule {}
