import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { GetCalendersResolverService } from 'src/app/general/resolvers/calender-resolver.service';
import { DashboardResolverService } from './general/services/dashboard-resolver.service';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    resolve: {
      dashboard: DashboardResolverService
    },
    data: {
      title: ''
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule {}
