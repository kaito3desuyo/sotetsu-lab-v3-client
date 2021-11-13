import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
    MatMomentDateModule,
    MAT_MOMENT_DATE_ADAPTER_OPTIONS,
    MAT_MOMENT_DATE_FORMATS,
    MomentDateAdapter,
} from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import 'moment/locale/ja';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { CustomPaginator } from './classes/custom-paginator';
import { ConfirmDialogContainerComponent } from './components/confirm-dialog-container/confirm-dialog-container.component';
import { ConfirmDialogPresentationalComponent } from './components/confirm-dialog-presentational/confirm-dialog-presentational.component';
import { AuthInterceptor } from './interceptors/auth-interceptor';
import { ErrorHandlerService } from './services/error-handler.service';

@NgModule({
    imports: [
        CommonModule,
        FlexLayoutModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatSnackBarModule,
        MatMomentDateModule,
        HttpClientModule,
        LoggerModule.forRoot({
            level: environment.production
                ? NgxLoggerLevel.OFF
                : NgxLoggerLevel.DEBUG,
            serverLogLevel: NgxLoggerLevel.OFF,
        }),
    ],
    exports: [
        ConfirmDialogContainerComponent,
        ConfirmDialogPresentationalComponent,
    ],
    declarations: [
        ConfirmDialogContainerComponent,
        ConfirmDialogPresentationalComponent,
    ],
    entryComponents: [ConfirmDialogContainerComponent],
    providers: [
        {
            provide: MatPaginatorIntl,
            useClass: CustomPaginator,
        },
        {
            provide: ErrorHandler,
            useClass: ErrorHandlerService,
        },
        { provide: MAT_DATE_LOCALE, useValue: 'ja-JP' },
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        },
        { provide: MAT_DATE_FORMATS, useValue: MAT_MOMENT_DATE_FORMATS },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: AuthInterceptor,
            // 必須：HTTP_INTERCEPTORSが配列であることを示す
            multi: true,
        },
    ],
})
export class GeneralModule {}
