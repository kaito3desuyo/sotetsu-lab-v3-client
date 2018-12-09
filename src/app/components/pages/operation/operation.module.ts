import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperationComponent } from './operation.component';
import { Routes, RouterModule } from '@angular/router';
import { RealTimeComponent } from './real-time/real-time.component';
import { RealTimeModule } from './real-time/real-time.module';

const routes: Routes = [
  { path: 'Operation', component: OperationComponent },
  { path: 'Operation/realtime', component: RealTimeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes), RealTimeModule, CommonModule],
  declarations: [OperationComponent]
})
export class OperationModule {}
