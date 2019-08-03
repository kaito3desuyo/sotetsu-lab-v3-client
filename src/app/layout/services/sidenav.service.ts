import { Injectable, EventEmitter } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {
  private readonly sidenavState: BehaviorSubject<boolean> = new BehaviorSubject<
    boolean
  >(false);

  constructor() {}

  getState(): Observable<boolean> {
    return this.sidenavState.asObservable();
  }

  setState(bool: boolean): void {
    this.sidenavState.next(bool);
  }
}
