import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';

type OperationPastTimeState = {
    referenceDate: string;
    days: number;
    formations: FormationDetailsDto[];
};

@Injectable()
export class OperationPastTimeStateStore extends Store<OperationPastTimeState> {
    constructor() {
        super(
            {
                referenceDate: null,
                days: null,
                formations: [],
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

    setFormations(formations: FormationDetailsDto[]): void {
        this.update({
            formations,
        });
    }
}

@Injectable()
export class OperationPastTimeStateQuery extends Query<OperationPastTimeState> {
    readonly referenceDate$ = this.select('referenceDate');
    readonly days$ = this.select('days');
    readonly formations$ = this.select('formations');

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
