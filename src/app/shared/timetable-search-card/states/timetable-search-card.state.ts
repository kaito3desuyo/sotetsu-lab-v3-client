import { Injectable } from '@angular/core';
import { guid, Query, Store } from '@datorama/akita';
import { ITimetableSearchCardForm } from '../interfaces/timetable-search-card-form';

type TimetableSearchCardState = {
    currentState: ITimetableSearchCardForm;
};

@Injectable()
export class TimetableSearchCardStateStore extends Store<TimetableSearchCardState> {
    constructor() {
        super(
            {
                currentState: null,
            },
            { name: `TimetableSearchCard-${guid()}` }
        );
    }

    updateCurrentState(state: Partial<ITimetableSearchCardForm>): void {
        this.update({
            currentState: {
                ...this.getValue().currentState,
                ...state,
            },
        });
    }
}

@Injectable()
export class TimetableSearchCardStateQuery extends Query<TimetableSearchCardState> {
    readonly currentState$ = this.select('currentState');

    get currentState(): ITimetableSearchCardForm {
        return this.getValue().currentState;
    }

    constructor(protected store: TimetableSearchCardStateStore) {
        super(store);
    }
}
