import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private calenders: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor() {}

  getCalenders(): Observable<any> {
    return this.calenders.asObservable();
  }

  setCalenders(value: any): void {
    this.calenders.next(value);
  }
}
