import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ServicesResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}
  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getServices();
  }
}
