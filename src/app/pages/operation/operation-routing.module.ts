import { Routes, RouterModule } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { NgModule } from '@angular/core';
import moment from 'moment';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { OperationTableComponent } from './operation-table/operation-table.component';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';

const routes: Routes = [
  {
    path: 'real-time',
    component: OperationRealTimeComponent,
    resolve: {
      operationRealTime: OperationRealTimeResolverService
    },
    runGuardsAndResolvers: 'always',
    data: {
      title: 'リアルタイム運用情報',
      date: moment()
        .subtract(moment().hour() < 4 ? 1 : 0)
        .format('YYYY-MM-DD')
    }
  },
  {
    path: 'table/:calendarId',
    component: OperationTableComponent,
    resolve: {
      operationTable: OperationTableResolverService
    },
    runGuardsAndResolvers: 'always',
    data: {
      title: '運用表'
    }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OperationRoutingModule {}
