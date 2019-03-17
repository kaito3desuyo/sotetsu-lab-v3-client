import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularMaterialModule } from './modules/angular-material/angular-material.module';
import { AppRoutingModule } from './modules/app-routing/app-routing.module';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { AccessoriesModule } from './components/accessories/accessories.module';
import { PagesModule } from './components/pages/pages.module';
import { MatPaginatorIntl } from '@angular/material';
import { CustomPagenator } from './classes/custom-pagenator';

@NgModule({
  declarations: [AppComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    AngularMaterialModule,
    AppRoutingModule,
    HttpClientModule,
    PagesModule,
    AccessoriesModule
  ],
  providers: [
    {
      provide: MatPaginatorIntl,
      useClass: CustomPagenator
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
