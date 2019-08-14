import { Routes, RouterModule } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { NgModule } from '@angular/core';
import {
  OperationsAllSightingsResolverService,
  OperationsAllNumbersResolverService
} from 'src/app/general/resolvers/operation-resolver.service';

const routes: Routes = [
  {
    path: 'real-time',
    component: OperationRealTimeComponent,
    resolve: {
      operationNumbers: OperationsAllNumbersResolverService,
      sightings: OperationsAllSightingsResolverService
    },
    data: {
      title: 'リアルタイム運用情報'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperationRoutingModule {}
