import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewAntiBracketsPipe } from 'src/app/core/pipes/new-anti-brackets.pipe';
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
import { OperationRealTimeDayCountPipe } from '../../pipes/operation-real-time-day-count.pipe';

/**
 * リアルタイム運用情報・編成順の1編成=1カード。
 * 運用順カード（operation-real-time-operation-card）と視覚的に統一しつつ、
 * 「編成番号を主役」にした並びへ入れ替える: 左チップは運用番号（休車=運用番号100は
 * 「休」表示・リンク無効化。旧 operation-real-time-formation-table の <table> 実装の
 * ロジックをそのまま踏襲）、中央は編成番号＋所属会社/形式＋種別列番＋現在位置。
 * 現在位置の状態判定（prev/current/next）・目撃鮮度の色分け・履歴表示は
 * 運用順カードと同一ロジック。
 */
@Component({
    selector: 'app-operation-real-time-formation-card',
    templateUrl: './operation-real-time-formation-card.component.html',
    styleUrl: './operation-real-time-formation-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        RouterLink,
        MatIconModule,
        MatTooltipModule,
        NewOperationNumberLinkComponent,
        DateFnsPipe,
        NewFindByIdPipe,
        NewAntiBracketsPipe,
        NewOperationNumberColorPipe,
        OperationRealTimeDayCountPipe,
        TripClassBaseNamePipe,
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
                !expectedOperation ||
                latestId !== history.operationSightingId,
        );
    });

    /**
     * 編成の「形式・所属会社」付記を組み立てる（設計書 §5.2 / mockup-02 の
     * 「10000系・相鉄」形式）。編成順カードでは formation 自身が行エンティティの
     * ため、運用順カードのように formations() 配列から探す必要はなく、
     * agencyId から会社名を引くだけでよい。vehicle_type は素の形式番号
     * （例: 10000）なので「系」を付けて会社名と「・」で連結する。
     * formationNumber 文字列自体は加工しない。
     */
    readonly formationAnnotation = computed(() => {
        const agencyId = this.formation().agencyId;
        const agencyName = agencyId
            ? this.agencies().find((a) => a.agencyId === agencyId)
                  ?.agencyName
            : undefined;
        const vehicleTypePart = this.formation().vehicleType
            ? `${this.formation().vehicleType}系`
            : undefined;
        return [vehicleTypePart, agencyName]
            .filter((part) => !!part)
            .join('・');
    });
}
