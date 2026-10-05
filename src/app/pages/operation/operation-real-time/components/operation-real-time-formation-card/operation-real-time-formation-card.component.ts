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
 * リアルタイム運用情報・編成順の1編成=1カード。
 * 運用順カード（operation-real-time-operation-card）と視覚的に統一しつつ、
 * 「編成番号を主役」にした並びへ入れ替える: 左チップは運用番号（休車=運用番号100は
 * 「休」表示・リンク無効化。旧 operation-real-time-formation-table の <table> 実装の
 * ロジックをそのまま踏襲）、中央は編成番号＋所属会社/形式＋種別列番＋現在位置。
 * 目撃鮮度の色分け・履歴表示は運用順カードと同一ロジック。現在位置は
 * 共有部品 app-trip-position で運用順カードと同じ表示を使う。
 */
@Component({
    selector: 'app-operation-real-time-formation-card',
    templateUrl: './operation-real-time-formation-card.component.html',
    styleUrl: './operation-real-time-formation-card.component.scss',
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
export class OperationRealTimeFormationCardComponent {
    readonly formation = input.required<FormationDetailsDto>();
    readonly timeCrossSection = input<
        OperationSightingTimeCrossSectionDto | undefined
    >(undefined);
    readonly histories = input<OperationSightingDetailsDto[]>([]);
    readonly currentPosition = input<OperationCurrentPositionDto | undefined>(
        undefined,
    );
    readonly operations = input<OperationDetailsDto[]>([]);
    readonly agencies = input<AgencyDetailsDto[]>([]);
    readonly stations = input<StationDetailsDto[]>([]);
    readonly tripClasses = input<TripClassDetailsDto[]>([]);
    readonly calendarId = input<string | undefined>(undefined);
    readonly isVisibleSightingHistories = input<boolean>(false);
    readonly isVisibleCurrentPosition = input<boolean>(false);
    /**
     * 目撃データを取得中かどうか。未到着と「目撃が無い」を区別し、取得中は
     * 「不明」という確定値を出さず骨組みを描く（audit M4）。
     */
    readonly isSightingLoading = input<boolean>(false);

    readonly latestSighting = computed(
        () => this.timeCrossSection()?.latestSighting,
    );

    readonly expectedSightingOperation = computed(
        () => this.timeCrossSection()?.expectedSighting?.operation,
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
        const expectedOperation = this.expectedSightingOperation();
        const latestId = this.latestSighting()?.operationSightingId;
        return this.reversedHistories().some(
            (history) =>
                !expectedOperation || latestId !== history.operationSightingId,
        );
    });

    /**
     * 編成の「形式・所属会社」付記（例: 10000・相鉄）。編成順カードでは
     * formation 自身が行エンティティなので、配列から探さずそのまま渡す。
     */
    readonly formationAnnotation = computed(() =>
        formatFormationAnnotation(this.formation(), this.agencies()),
    );
}
