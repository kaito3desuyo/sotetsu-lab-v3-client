import { Routes, RouterModule } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { NgModule } from '@angular/core';
import { OperationsAllLatestSightingsResolverService } from 'src/app/general/resolvers/operation-resolver.service';
import moment from 'moment';
import { FormationsAllLatestSightingsResolverService } from 'src/app/general/resolvers/formation-resolver.service';
import {
  OperationRealTimeTripsResolverService,
  OperationRealTimeOperationNumbersResolverService,
  OperationRealTimeFormationNumbersResolverService
} from './general/services/operation-real-time-resolver.service';

const routes: Routes = [
  {
    path: 'real-time',
    component: OperationRealTimeComponent,
    resolve: {
      formationNumbers: OperationRealTimeFormationNumbersResolverService,
      formationSightings: FormationsAllLatestSightingsResolverService,
      operationNumbers: OperationRealTimeOperationNumbersResolverService,
      operationSightings: OperationsAllLatestSightingsResolverService,
      trips: OperationRealTimeTripsResolverService
    },
    runGuardsAndResolvers: 'always',
    data: {
      title: 'リアルタイム運用情報',
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
export class OperationRoutingModule {}
