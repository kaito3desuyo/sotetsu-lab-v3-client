import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    inject,
    input,
    output,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import { TrainDiagramSelectedTripInfo } from '../../interfaces/train-diagram-selected-trip-info.interface';

/**
 * N1 ダイヤグラムのタップ情報パネル（5.7・07-03 追加）。
 * 強調中の列車の種別・列車番号・行先・運用番号チップ・充当編成・目撃日付・詳細リンクを
 * モックのカード型（mockup-08）に合わせて画面下部に表示する（G7）。
 *
 * Task 13: 自身の高さ（PC は右下カード・スマホは下の帯で高さが変わる）を
 * ResizeObserver で測って heightChange で親（root）へ知らせる。root はこれを
 * chart の bottomInset に流し、図の最下段がカードに隠れないようスクロール領域の
 * 下に余白を作る。ResizeObserver が無い環境（テスト等）では何も出さない。
 */
@Component({
    selector: 'app-train-diagram-info-panel',
    templateUrl: './train-diagram-info-panel.component.html',
    styleUrl: './train-diagram-info-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatIconModule,
        TripLabelComponent,
        DateFnsPipe,
        PipesModule,
    ],
    host: {
        class: 'tw-fixed tw-inset-x-0 tw-bottom-0 tw-z-30 tw-block tw-rounded-t-xl tw-border tw-border-solid tw-border-grey-200 tw-bg-white tw-shadow-lg lg:tw-inset-x-auto lg:tw-bottom-4 lg:tw-right-4 lg:tw-w-[22rem] lg:tw-rounded-card',
    },
})
export class TrainDiagramInfoPanelComponent {
    readonly #elementRef = inject(ElementRef<HTMLElement>);
    readonly #destroyRef = inject(DestroyRef);

    readonly info = input.required<TrainDiagramSelectedTripInfo>();

    readonly closed = output<void>();
    readonly heightChange = output<number>();

    constructor() {
        afterNextRender(() => {
            if (typeof ResizeObserver === 'undefined') {
                return;
            }
            const observer = new ResizeObserver((entries) => {
                const height = entries[0]?.contentRect.height;
                if (height !== undefined) {
                    this.heightChange.emit(height);
                }
            });
            observer.observe(this.#elementRef.nativeElement);
            this.#destroyRef.onDestroy(() => observer.disconnect());
        });
    }
}
