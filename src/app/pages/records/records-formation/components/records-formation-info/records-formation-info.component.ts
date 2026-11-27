import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { FormationTrainComponent } from '../formation-train/formation-train.component';
import {
    formatPeriodRange,
    toModificationRow,
} from '../../utils/formation-display.util';
import {
    buildModificationHistory,
    changedCars,
    FormationPeriod,
    periodAt,
    VehicleModifications,
} from '../../utils/formation-periods.util';

/**
 * 編成の情報のカード。今見ている月の組成（車両の絵）、組み換えの履歴（期間が 2 つ以上のときのみ）、
 * 改造の経歴（記録があるときのみ）を出す。
 */
@Component({
    selector: 'app-records-formation-info',
    templateUrl: './records-formation-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormationTrainComponent],
    host: { class: 'tw-block' },
})
export class RecordsFormationInfoComponent {
    /** 新しい期間から順 */
    readonly periods = input.required<readonly FormationPeriod[]>();
    readonly modifications = input<VehicleModifications>({});
    /** 組成を決める日（今見ている月の最終日。今の月なら今日）。'YYYY-MM-DD' */
    readonly referenceDate = input.required<string>();

    protected readonly current = computed(() =>
        periodAt([...this.periods()], this.referenceDate()),
    );

    protected readonly history = computed(() => {
        const periods = [...this.periods()];
        if (periods.length < 2) return [];
        return periods.map((period, index) => ({
            range: formatPeriodRange(period),
            carCount: period.cars.length,
            cars: period.cars,
            changed: changedCars(periods, index),
        }));
    });

    protected readonly modificationRows = computed(() => {
        const current = this.current();
        return current
            ? buildModificationHistory(current, this.modifications()).map(
                  toModificationRow,
              )
            : [];
    });
}
