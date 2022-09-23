import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import {
    MatMomentDateModule,
    MAT_MOMENT_DATE_ADAPTER_OPTIONS,
    MAT_MOMENT_DATE_FORMATS,
    MomentDateAdapter,
} from '@angular/material-moment-adapter';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import 'moment/locale/ja';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';
import { AuthInterceptor } from '../core/interceptors/auth-interceptor';
import { ErrorHandlerService } from '../core/services/error-handler.service';
import { CustomPaginator } from './classes/custom-paginator';

@NgModule({
    imports: [
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
