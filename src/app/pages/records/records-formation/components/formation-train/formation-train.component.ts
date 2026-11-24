import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { FormationCar } from '../../utils/formation-periods.util';
import { buildCarArt, CarArt } from '../../utils/car-art.util';

interface TrainSlot {
    vehicleNumber: string;
    carNumber: number;
    changed: boolean;
    art: CarArt;
}

/** 部品ごとの clipPath の id を重ねないための連番（描く図の中だけで使い、状態は持たない） */
let nextTrainId = 0;

/**
 * 車両を横から見た絵の列。両端は先頭の形、中間は箱の形。窓と扉は描かない。
 * 絵はカードの幅に収め（横にスクロールさせない）、狭い画面では 5 両ずつ折り返す。
 */
@Component({
    selector: 'app-formation-train',
    templateUrl: './formation-train.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'tw-block' },
})
export class FormationTrainComponent {
    readonly cars = input.required<readonly FormationCar[]>();
    /** 赤い太字で出す車両番号（前の組成から入れ替わった車両） */
    readonly highlight = input<ReadonlySet<string>>(new Set());
    readonly size = input<'large' | 'small'>('large');
    /** 絵の下に号車の番号を出すか */
    readonly showCarNumber = input(true);

    protected readonly idPrefix = `formation-train-${nextTrainId++}`;

    protected readonly listClass = computed(() =>
        this.size() === 'small'
            ? 'tw-m-0 tw-flex tw-list-none tw-flex-wrap tw-gap-y-1.5 tw-p-0 md:tw-max-w-[40rem]'
            : 'tw-m-0 tw-flex tw-list-none tw-flex-wrap tw-gap-y-1.5 tw-p-0',
    );
    protected readonly numberClass = computed(() =>
        this.size() === 'small'
            ? 'tw-tabular-nums tw-text-[10px]'
            : 'tw-tabular-nums tw-text-[11px] md:tw-text-xs',
    );

    protected readonly slots = computed((): TrainSlot[] => {
        const cars = this.cars();
        const highlight = this.highlight();
        return cars.map((car, index) => ({
            vehicleNumber: car.vehicleNumber,
            carNumber: index + 1,
            changed: highlight.has(car.vehicleNumber),
            art: buildCarArt(
                car.livery,
                index === 0
                    ? 'left'
                    : index === cars.length - 1
                      ? 'right'
                      : null,
            ),
        }));
    });
}
