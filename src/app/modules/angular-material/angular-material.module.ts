import { NgModule } from '@angular/core';

import {
  MatFormFieldModule,
  MatRadioModule,
  MatSelectModule,
  MatButtonModule,
  MatToolbarModule,
  MatCardModule,
  MatSlideToggleModule
} from '@angular/material';

@NgModule({
  declarations: [],
  imports: [
    MatFormFieldModule,
    MatRadioModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatSlideToggleModule
  ],
  exports: [
    MatFormFieldModule,
    MatRadioModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatSlideToggleModule
  ]
})
export class AngularMaterialModule {}
