import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';

export interface TokenState {
    accessToken: string;
    expiresAt: number;
    tokenType: string;
}

export function createInitialState(): TokenState {
    return {
        accessToken: null,
        expiresAt: null,
        tokenType: null,
    };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'token' })
export class TokenStore extends Store<TokenState> {
    constructor() {
        super(createInitialState());
    }
}
