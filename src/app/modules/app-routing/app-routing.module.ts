import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TopModule } from 'src/app/components/pages/top/top.module';

@NgModule({
  imports: [TopModule],
  exports: [RouterModule]
})
export class AppRoutingModule {}
