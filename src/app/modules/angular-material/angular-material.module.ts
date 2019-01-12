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
  MatSnackBarModule,
  MatListModule,
  MatDialogModule
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
    MatSnackBarModule,
    MatListModule,
    MatDialogModule
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
    MatSnackBarModule,
    MatListModule,
    MatDialogModule
  ]
})
export class AngularMaterialModule {}
