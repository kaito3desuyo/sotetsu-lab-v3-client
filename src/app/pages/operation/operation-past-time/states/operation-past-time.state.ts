import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';

type OperationPastTimeState = {
    referenceDate: string;
    days: number;
};

@Injectable()
export class OperationPastTimeStateStore extends Store<OperationPastTimeState> {
    constructor() {
        super(
            {
                referenceDate: null,
                days: null,
            },
            { name: `OperationPastTime-${guid()}` }
        );
    }

    setReferenceDate(date: string): void {
        this.update({
            referenceDate: date,
        });
    }

    setDays(days: number): void {
        this.update({
            days,
        });
    }
}

@Injectable()
export class OperationPastTimeStateQuery extends Query<OperationPastTimeState> {
    readonly referenceDate$ = this.select('referenceDate');
    readonly days$ = this.select('days');

    get referenceDate(): string {
        return this.getValue().referenceDate;
    }

    get days(): number {
        return this.getValue().days;
    }

    constructor(protected store: OperationPastTimeStateStore) {
        super(store);
    }
}
