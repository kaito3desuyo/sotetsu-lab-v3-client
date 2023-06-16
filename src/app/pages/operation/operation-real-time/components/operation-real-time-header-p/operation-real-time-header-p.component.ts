import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    Input,
    inject,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { PushModule } from '@rx-angular/template/push';
import { Dayjs } from 'dayjs';
import { Subject } from 'rxjs';
import { map } from 'rxjs/operators';

type State = {
    finalUpdateTime: Dayjs;
};

@Component({
    standalone: true,
    selector: 'app-operation-real-time-header-p',
    templateUrl: './operation-real-time-header-p.component.html',
    styleUrls: ['./operation-real-time-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, PushModule],
    providers: [RxState],
})
export class OperationRealTimeHeaderPComponent {
    private readonly state = inject<RxState<State>>(RxState);

    readonly finalUpdateTime$ = this.state
        .select('finalUpdateTime')
        .pipe(map((time) => time.toDate()));

    readonly onChangedInputFinalUpdateTime$ = new Subject<Dayjs>();

    @Input() set finalUpdateTime(time: Dayjs) {
        this.onChangedInputFinalUpdateTime$.next(time);
    }

    constructor() {
        this.state.connect(
            'finalUpdateTime',
            this.onChangedInputFinalUpdateTime$.asObservable()
        );
    }
}
