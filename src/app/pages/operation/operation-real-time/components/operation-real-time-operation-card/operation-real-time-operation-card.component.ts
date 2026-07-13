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
 * リアルタイム運用情報・運用順の1運用=1カード。
 * mockup-02 準拠のカードUI。現在位置の状態判定（prev/current/next からの
 * 出庫前○ / 一時入庫 / 停車中 / 入庫済△ / 走行中 / 不明？の導出）は
 * 旧 operation-real-time-operation-table の <table> 実装のロジックをそのまま踏襲する。
 */
@Component({
    selector: 'app-operation-real-time-operation-card',
    templateUrl: './operation-real-time-operation-card.component.html',
    styleUrl: './operation-real-time-operation-card.component.scss',
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
                !formationVm ||
                latestId !== history.operationSightingId,
        );
    });

    /**
     * 編成の「所属会社・形式」付記（例: 相鉄12000）を組み立てる（設計書 §5.2）。
     * 「系/形」等の厳密表記は避け、会社名＋形式番号を連結するだけにする。
     * formationNumber 文字列自体は加工しない。
     */
    readonly formationAnnotation = computed(() => {
        const formationId = this.expectedSightingFormation()?.formationId;
        if (!formationId) {
            return '';
        }
        const formation = this.formations().find(
            (f) => f.formationId === formationId,
        );
        if (!formation) {
            return '';
        }
        const agencyName = formation.agencyId
            ? this.agencies().find((a) => a.agencyId === formation.agencyId)
                  ?.agencyName
            : undefined;
        return [agencyName, formation.vehicleType]
            .filter((part) => !!part)
            .join('');
    });
}
