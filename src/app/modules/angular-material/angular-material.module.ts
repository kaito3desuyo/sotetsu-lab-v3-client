import { NgModule } from '@angular/core';

import {
  MatButtonModule,
  MatToolbarModule,
  MatCardModule
} from '@angular/material';

@NgModule({
  declarations: [],
  imports: [MatCardModule, MatButtonModule, MatToolbarModule],
  exports: [MatCardModule, MatButtonModule, MatToolbarModule]
})
export class AngularMaterialModule {}
