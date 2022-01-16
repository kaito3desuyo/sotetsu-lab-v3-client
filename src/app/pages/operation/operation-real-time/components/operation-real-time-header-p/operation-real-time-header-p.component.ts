import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Dayjs } from 'dayjs';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

type State = {
    finalUpdateTime: Dayjs;
};

@Component({
    selector: 'app-operation-real-time-header-p',
    templateUrl: './operation-real-time-header-p.component.html',
    styleUrls: ['./operation-real-time-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationRealTimeHeaderPComponent {
    readonly finalUpdateTime$ = this.state
        .select('finalUpdateTime')
        .pipe(map((time) => time.toDate()));

    readonly onChangedInputFinalUpdateTime$ = new Subject<Dayjs>();

    @Input() set finalUpdateTime(time: Dayjs) {
        this.onChangedInputFinalUpdateTime$.next(time);
    }

    constructor(private readonly state: RxState<State>) {
        this.state.connect(
            'finalUpdateTime',
            this.onChangedInputFinalUpdateTime$
        );
    }
}
