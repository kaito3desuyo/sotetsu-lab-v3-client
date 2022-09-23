import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { IConfirmDialogData } from '../interfaces/confirm-dialog-data.interface';

type State = {
    data: IConfirmDialogData;
};

@Injectable()
export class ConfirmDialogStateStore extends Store<State> {
    constructor() {
        super({ data: null }, { name: `ConfirmDialog-${guid()}` });
    }

    setData(data: IConfirmDialogData): void {
        this.update({ data });
    }
}

@Injectable()
export class ConfirmDialogStateQuery extends Query<State> {
    readonly data$ = this.select('data');

    constructor(protected readonly store: ConfirmDialogStateStore) {
        super(store);
    }
}
