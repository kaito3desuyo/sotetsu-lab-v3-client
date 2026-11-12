import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { StationGroup } from 'src/app/shared/station-groups.util';
import { FormationDateKind } from '../../stores/timetable-formation.store';

/**
 * 編成別時刻表の操作部（操作帯の中身）。編成番号・駅で絞る・日付の欄。
 * 値は親から受け、操作は出力で返す。
 */
@Component({
    selector: 'app-timetable-formation-controls',
    templateUrl: './timetable-formation-controls.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        LazyOptionsDirective,
    ],
    host: { class: 'tw-block' },
})
export class TimetableFormationControlsComponent {
    readonly formationNumber = input<string | null>(null);
    /** 編成が見つかったときだけ駅の欄を出す */
    readonly showStation = input(false);
    readonly stationGroups = input<StationGroup[]>([]);
    readonly selectedStationId = input<string | null>(null);
    readonly selectedStationName = input<string | null>(null);
    readonly date = input<string | null>(null);
    readonly dateKind = input<FormationDateKind>('today');
    /** 日付の欄で選べる最後の日 */
    readonly maxDate = input<string | null>(null);
    readonly canGoNext = input(false);
    readonly tomorrowBlocked = input(false);

    readonly formationNumberSubmit = output<string>();
    readonly stationChange = output<string | null>();
    readonly dateChange = output<string>();
    readonly shift = output<-1 | 1>();

    protected readonly dateKindLabel = computed(() => {
        switch (this.dateKind()) {
            case 'today':
                return '今日';
            case 'tomorrow':
                return '明日（見込み）';
            default:
                return '過去の日';
        }
    });

    protected onInput(event: Event): void {
        this.formationNumberSubmit.emit(
            (event.target as HTMLInputElement).value,
        );
    }

    protected onDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value) this.dateChange.emit(value);
    }
}
