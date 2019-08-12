import { NgModule } from '@angular/core';

import { AngularMaterialModule } from 'src/app/modules/angular-material/angular-material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { RealTimeComponent } from './operation/real-time/real-time.component';
import { TimetableComponent } from './timetable/timetable.component';
import { AddTimetableComponent } from './timetable/add-timetable/add-timetable.component';
import { AccessoriesModule } from '../accessories/accessories.module';
import { TopComponent } from './top/top.component';
import { PipesModule } from 'src/app/modules/pipes/pipes.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { TimetableAllLineComponent } from './timetable/timetable-all-line/timetable-all-line.component';
import { TimetableStationComponent } from './timetable/timetable-station/timetable-station.component';
import { NgxPerfectScrollbarModule } from 'src/app/modules/ngx-perfect-scrollbar/ngx-perfect-scrollbar.module';
import { TimetableEditorComponent } from './timetable/timetable-editor/timetable-editor.component';
import { OperationTableComponent } from './operation/table/operation-table.component';
import { OperationRouteDiagramComponent } from './operation/route-diagram/operation-route-diagram.component';
import { AdsenseModule } from 'ng2-adsense';

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    RouterModule,
    AngularMaterialModule,
    FlexLayoutModule,
    NgxPerfectScrollbarModule,
    FormsModule,
    ReactiveFormsModule,
    AccessoriesModule,
    PipesModule.forRoot(),
    AdsenseModule.forRoot({
      adClient: 'ca-pub-8923857677281403'
    })
  ],
  declarations: [
    TopComponent,
    RealTimeComponent,
    OperationTableComponent,
    OperationRouteDiagramComponent,
    TimetableComponent,
    TimetableAllLineComponent,
    TimetableStationComponent,
    TimetableEditorComponent,
    AddTimetableComponent
  ]
})
export class PagesModule {}