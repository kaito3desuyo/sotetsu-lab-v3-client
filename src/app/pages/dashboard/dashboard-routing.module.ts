import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { DashboardResolverService } from './general/services/dashboard-resolver.service';
import moment from 'moment';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    resolve: {
      dashboard: DashboardResolverService
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
