import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { DashboardResolverService } from './general/services/dashboard-resolver.service';
import moment from 'moment';
import { TimetableSearchFormResolverService } from 'src/app/shared/timetable-shared/services/timetable-search-form-resolver.service';

const routes: Routes = [
    {
        path: '',
        component: DashboardComponent,
        resolve: {
            dashboard: DashboardResolverService,
            timetableSearchForm: TimetableSearchFormResolverService
        },
        data: {
            title: '',
            date: moment()
                .subtract(moment().hour() < 4 ? 1 : 0)
                .format('YYYY-MM-DD')
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DashboardRoutingModule {}
