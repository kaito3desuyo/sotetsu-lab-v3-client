import { Injectable, ErrorHandler } from '@angular/core';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  constructor(private loggerService: LoggerService) {}

  handleError(error: any): void {
    this.loggerService.error(error.message, error);
  }
}
