import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./pages/dashboard/dashboard.module').then(
        mod => mod.DashboardModule
      )
  },
  {
    path: 'operation',
    loadChildren: () =>
      import('./pages/operation/operation.module').then(
        mod => mod.OperationModule
      )
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
