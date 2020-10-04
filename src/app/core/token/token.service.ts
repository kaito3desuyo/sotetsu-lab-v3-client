import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { TokenQuery } from './token.query';
import { TokenState, TokenStore } from './token.store';

@Injectable({ providedIn: 'root' })
export class TokenService {
    constructor(
        private readonly http: HttpClient,
        private readonly tokenStore: TokenStore,
        private readonly tokenQuery: TokenQuery
    ) {}

    getToken(): Observable<TokenState> {
        return this.tokenQuery.all$;
    }

    fetchToken(): Observable<void> {
        return this.http.get(environment.backendUrl + '/token').pipe(
            tap((v) => this.tokenStore.update(v)),
            map(() => null)
        );
    }
}
