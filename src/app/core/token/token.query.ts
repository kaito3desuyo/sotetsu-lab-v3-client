import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { TokenState, TokenStore } from './token.store';

@Injectable({ providedIn: 'root' })
export class TokenQuery extends Query<TokenState> {
    all$ = this.select();

    constructor(protected store: TokenStore) {
        super(store);
    }
}
