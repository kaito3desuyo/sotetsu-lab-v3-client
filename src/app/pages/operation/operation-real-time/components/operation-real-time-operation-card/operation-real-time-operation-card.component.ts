import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewFindByIdPipe } from 'src/app/core/pipes/new-find-by-id.pipe';
import { NewOperationNumberColorPipe } from 'src/app/core/pipes/new-operation-number-color.pipe';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { NewOperationNumberLinkComponent } from 'src/app/shared/new-operation-number-link/new-operation-number-link.component';
import { TripClassBaseNamePipe } from 'src/app/shared/pipes/trip-class-base-name.pipe';
import { formatFormationAnnotation } from 'src/app/shared/formation-annotation.util';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { OperationRealTimeDayCountPipe } from '../../pipes/operation-real-time-day-count.pipe';

/**
 * リアルタイム運用情報・運用順の1運用=1カード。
 * mockup-02 準拠のカードUI。現在位置の表示と状態判定（出庫前○ / 一時入庫 /
 * 停車中 / 入庫済△ / 走行中 / 不明？）は共有部品 app-trip-position が持つ。
 */
@Component({
    selector: 'app-operation-real-time-operation-card',
    templateUrl: './operation-real-time-operation-card.component.html',
    styleUrl: './operation-real-time-operation-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIconModule,
        MatTooltipModule,
        NewOperationNumberLinkComponent,
        DateFnsPipe,
        NewFindByIdPipe,
        NewOperationNumberColorPipe,
        OperationRealTimeDayCountPipe,
        TripClassBaseNamePipe,
        TripPositionComponent,
    ],
})
export class OperationRealTimeOperationCardComponent {
    readonly operation = input.required<OperationDetailsDto>();
    readonly timeCrossSection = input<
        OperationSightingTimeCrossSectionDto | undefined
    >(undefined);
    readonly histories = input<OperationSightingDetailsDto[]>([]);
    readonly currentPosition = input<OperationCurrentPositionDto | undefined>(
        undefined,
    );
    readonly formations = input<FormationDetailsDto[]>([]);
    readonly agencies = input<AgencyDetailsDto[]>([]);
    readonly stations = input<StationDetailsDto[]>([]);
    readonly tripClasses = input<TripClassDetailsDto[]>([]);
    readonly calendarId = input<string | undefined>(undefined);
    readonly isVisibleSightingHistories = input<boolean>(false);
    readonly isVisibleCurrentPosition = input<boolean>(false);
    /**
     * 目撃データを取得中かどうか。
     *
     * 目撃系の入力（timeCrossSection 等）は運用データより遅れて到着するため、
     * 未到着と「目撃が無い」を区別せず一律「不明」を描画すると、初回表示で全件
     * 「不明」を出したあと実データへ差し替わる（audit M4）。取得中は確定値を
     * 出さず骨組みを描く。
     */
    readonly isSightingLoading = input<boolean>(false);

    readonly latestSighting = computed(
        () => this.timeCrossSection()?.latestSighting,
    );

    readonly expectedSightingFormation = computed(
        () => this.timeCrossSection()?.expectedSighting?.formation,
    );

    readonly reversedHistories = computed(() =>
        [...this.histories()].reverse(),
    );

    /**
     * テンプレートの履歴表示と同一の除外条件（最新目撃を履歴から除く）を通過する
     * エントリが1件以上あるかを判定する。0件のときは「履歴」ラベルごとブロックを
     * 出さないための可視性フラグ。
     */
    readonly hasVisibleHistories = computed(() => {
        const formationVm = this.expectedSightingFormation();
        const latestId = this.latestSighting()?.operationSightingId;
        return this.reversedHistories().some(
            (history) =>
                !formationVm || latestId !== history.operationSightingId,
        );
    });

    /** 編成の「形式・所属会社」付記（例: 10000・相鉄）。 */
    readonly formationAnnotation = computed(() => {
        const formationId = this.expectedSightingFormation()?.formationId;
        if (!formationId) {
            return '';
        }
        return formatFormationAnnotation(
            this.formations().find((f) => f.formationId === formationId),
            this.agencies(),
        );
    });
}
