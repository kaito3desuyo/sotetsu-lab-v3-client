import { Injectable } from '@angular/core';
import { CustomNGXLoggerService, NGXLogger, NgxLoggerLevel } from 'ngx-logger';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private logger: NGXLogger;
  constructor(private customLogger: CustomNGXLoggerService) {
    this.logger = this.customLogger.create({
      level: NgxLoggerLevel.DEBUG,
      serverLoggingUrl: environment.apiUrl + '/api/v1/log',
      serverLogLevel: NgxLoggerLevel.OFF
    });
  }

  error(message: string, ...additional: any[]): void {
    this.logger.error(message, ...additional);
  }

  debug(message: string, ...additional: any[]): void {
    this.logger.debug(message, ...additional);
  }
}
