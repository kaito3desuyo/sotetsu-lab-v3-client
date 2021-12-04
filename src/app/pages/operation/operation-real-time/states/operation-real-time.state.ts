import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';

type OperationRealTimeState = {};

@Injectable()
export class OperationRealTimeStateStore extends Store<OperationRealTimeState> {
    constructor() {
        super(
            {},
            {
                name: `OperationRealTime-${guid()}`,
            }
        );
    }
}

@Injectable()
export class OperationRealTimeStateQuery extends Query<OperationRealTimeState> {
    constructor(protected store: OperationRealTimeStateStore) {
        super(store);
    }
}
