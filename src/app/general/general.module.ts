import { NgModule, ErrorHandler } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ConfirmDialogContainerComponent } from "./components/confirm-dialog-container/confirm-dialog-container.component";
import { ConfirmDialogPresentationalComponent } from "./components/confirm-dialog-presentational/confirm-dialog-presentational.component";
import { FlexLayoutModule } from "@angular/flex-layout";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { LoggerModule, NgxLoggerLevel } from "ngx-logger";
import { HttpClientModule, HTTP_INTERCEPTORS } from "@angular/common/http";
import { ErrorHandlerService } from "./services/error-handler.service";
import { AuthInterceptor } from "./interceptors/auth-interceptor";
import { MatPaginatorIntl } from "@angular/material/paginator";
import { CustomPaginator } from "./classes/custom-paginator";
import { environment } from "src/environments/environment";

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    HttpClientModule,
    LoggerModule.forRoot({
      level: environment.production ? NgxLoggerLevel.OFF : NgxLoggerLevel.DEBUG,
      serverLogLevel: NgxLoggerLevel.OFF
    })
  ],
  exports: [
    ConfirmDialogContainerComponent,
    ConfirmDialogPresentationalComponent
  ],
  declarations: [
    ConfirmDialogContainerComponent,
    ConfirmDialogPresentationalComponent
  ],
  entryComponents: [ConfirmDialogContainerComponent],
  providers: [
    {
      provide: MatPaginatorIntl,
      useClass: CustomPaginator
    },
    {
      provide: ErrorHandler,
      useClass: ErrorHandlerService
    }
    /* 
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      // 必須：HTTP_INTERCEPTORSが配列であることを示す
      multi: true
    }
    */
  ]
})
export class GeneralModule {}
