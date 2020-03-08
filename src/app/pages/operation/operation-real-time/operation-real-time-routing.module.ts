import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { RouterModule } from '@angular/router';
import { OperationRealTimeResolverService } from './general/services/operation-real-time-resolver.service';
import moment from 'moment';

const routes: Routes = [
    {
        path: '',
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
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperationRealTimeRoutingModule {}
