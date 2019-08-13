import { Routes, RouterModule } from '@angular/router';
import { OperationRealTimeComponent } from './operation-real-time/operation-real-time.component';
import { NgModule } from '@angular/core';

const routes: Routes = [
  {
    path: 'real-time',
    component: OperationRealTimeComponent,
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
