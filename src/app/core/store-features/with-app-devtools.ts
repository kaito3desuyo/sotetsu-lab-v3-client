import { withDevToolsStub, withDevtools } from '@ngrx-toolkit/core';

import { environment } from '../../../environments/environment';

/** 本番では Redux DevTools に繋がない */
export function withAppDevtools(name: string) {
    return environment.production ? withDevToolsStub(name) : withDevtools(name);
}
