import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddOperationSightingFormComponent } from './add-operation-sighting-form.component';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ExceptionDialogComponent } from '../exception-dialog/exception-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    AngularMaterialModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule
  ],
  exports: [AddOperationSightingFormComponent],
  declarations: [AddOperationSightingFormComponent],
  entryComponents: [ExceptionDialogComponent]
})
export class AddOperationSightingFormModule {}
