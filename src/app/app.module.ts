import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AngularMaterialModule } from './modules/angular-material/angular-material.module';
import { AppRoutingModule } from './modules/app-routing/app-routing.module';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AccessoriesModule } from './components/accessories/accessories.module';
import { PagesModule } from './components/pages/pages.module';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { CustomPagenator } from './classes/custom-pagenator';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { NgxPerfectScrollbarModule } from './modules/ngx-perfect-scrollbar/ngx-perfect-scrollbar.module';
import { ErrorHandlerService } from './services/error-handler.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { AdsenseModule } from 'ng2-adsense';

@NgModule({
  declarations: [AppComponent],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    FlexLayoutModule,
    AngularMaterialModule,
    NgxPerfectScrollbarModule,
    AppRoutingModule,
    HttpClientModule,
    PagesModule,
    AccessoriesModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production
    })
  ],
  providers: [
    {
      provide: MatPaginatorIntl,
      useClass: CustomPagenator
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      // 必須：HTTP_INTERCEPTORSが配列であることを示す
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: ErrorHandlerService
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
