import { Routes, RouterModule } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { NgModule } from '@angular/core';
import moment from 'moment';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import { OperationTableComponent } from './operation-table/operation-table.component';
import { OperationTableResolverService } from './general/services/operation-table-resolver.service';
import { OperationRouteDiagramComponent } from './operation-route-diagram/operation-route-diagram.component';
import { OperationRouteDiagramResolverService } from './general/services/operation-route-diagram-resolver.service';
import { OperationPastTimeComponent } from './operation-past-time/operation-past-time.component';
import { OperationPastTimeResolverService } from './general/services/operation-past-time-resolver.service';

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
        path: 'past-time',
        component: OperationPastTimeComponent,
        resolve: {
            from: OperationPastTimeResolverService
        },
        runGuardsAndResolvers: 'always',
        data: {
            title: '過去の運用情報'
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
    },
    {
        path: 'route-diagram/:operationId',
        component: OperationRouteDiagramComponent,
        resolve: {
            operationRouteDiagram: OperationRouteDiagramResolverService
        },
        data: {
            title: '運用行路図'
        }
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationRoutingModule {}
