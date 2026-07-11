import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripClassBaseNamePipe } from 'src/app/shared/pipes/trip-class-base-name.pipe';
import { TrainDiagramSelectedTripInfo } from '../../interfaces/train-diagram-selected-trip-info.interface';

/**
 * N1 ダイヤグラムのタップ情報パネル（5.7・07-03 追加）。
 * 強調中の列車の種別・列車番号・行先・運用番号チップ・充当編成・詳細リンクを画面下部に表示する。
 */
@Component({
    selector: 'app-train-diagram-info-panel',
    templateUrl: './train-diagram-info-panel.component.html',
    styleUrl: './train-diagram-info-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatIconModule,
        OperationNumberTagComponent,
        TripClassBaseNamePipe,
    ],
    host: {
        class:
            'tw-fixed tw-inset-x-0 tw-bottom-0 tw-z-30 tw-border-t tw-border-grey-200 tw-bg-white tw-shadow-lg',
    },
})
export class TrainDiagramInfoPanelComponent {
    readonly info = input.required<TrainDiagramSelectedTripInfo>();

    readonly closed = output<void>();
}
