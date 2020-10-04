import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import moment from 'moment';
import { Observable, of } from 'rxjs';
import { flatMap, take } from 'rxjs/operators';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class TokenResolver implements Resolve<Observable<void>> {
    constructor(private readonly tokenService: TokenService) {}

    resolve(): Observable<void> {
        return this.tokenService.getToken().pipe(
            take(1),
            flatMap((token) => {
                if (token.expiresAt < moment().unix()) {
                    return this.tokenService.fetchToken();
                } else {
                    return of(null);
                }
            })
        );
    }
}
