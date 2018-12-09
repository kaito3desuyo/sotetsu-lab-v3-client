import { NgModule } from '@angular/core';

import {
  MatFormFieldModule,
  MatRadioModule,
  MatSelectModule,
  MatButtonModule,
  MatToolbarModule,
  MatCardModule,
  MatSlideToggleModule,
  MatInputModule,
  MatSnackBarModule
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
    MatSlideToggleModule,
    MatInputModule,
    MatSnackBarModule
  ],
  exports: [
    MatFormFieldModule,
    MatRadioModule,
    MatSelectModule,
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    MatSlideToggleModule,
    MatInputModule,
    MatSnackBarModule
  ]
})
export class AngularMaterialModule {}
