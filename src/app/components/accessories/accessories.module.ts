import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';
import { OperationRealtimeByFormationComponent } from './operation/operation-realtime-by-formation/operation-realtime-by-formation.component';
import { OperationRealtimeByOperationComponent } from './operation/operation-realtime-by-operation/operation-realtime-by-operation.component';
import { OperationHistoryDialogComponent } from './operation/operation-history-dialog/operation-history-dialog.component';
import { AddOperationSightingFormComponent } from './operation/add-operation-sighting-form/add-operation-sighting-form.component';
import { ExceptionDialogComponent } from './exception-dialog/exception-dialog.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PipesModule } from 'src/app/modules/pipes/pipes.module';
import { SearchTimetableFormComponent } from './timetable/search-timetable-form/search-timetable-form.component';
import { AddTimetablePreFormComponent } from './timetable/add-timetable-pre-form/add-timetable-pre-form.component';
import { HeaderComponent } from './header/header.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { RouterModule } from '@angular/router';
import { LoadingComponent } from './loading/loading.component';
import { PerfectScrollbarModule } from 'ngx-perfect-scrollbar';
import { Nl2brModule } from 'nl2br-pipe';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    AngularMaterialModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule.forRoot(),
    PerfectScrollbarModule,
    Nl2brModule
  ],
  exports: [
    HeaderComponent,
    SidenavComponent,
    ExceptionDialogComponent,
    OperationRealtimeByFormationComponent,
    OperationRealtimeByOperationComponent,
    OperationHistoryDialogComponent,
    AddOperationSightingFormComponent,
    SearchTimetableFormComponent,
    AddTimetablePreFormComponent,
    LoadingComponent
  ],
  declarations: [
    HeaderComponent,
    SidenavComponent,
    ExceptionDialogComponent,
    OperationRealtimeByFormationComponent,
    OperationRealtimeByOperationComponent,
    OperationHistoryDialogComponent,
    AddOperationSightingFormComponent,
    SearchTimetableFormComponent,
    AddTimetablePreFormComponent,
    LoadingComponent
  ],
  entryComponents: [
    OperationHistoryDialogComponent,
    LoadingComponent,
    ExceptionDialogComponent
  ]
})
export class AccessoriesModule {}
