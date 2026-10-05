import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NewAntiBracketsPipe } from 'src/app/core/pipes/new-anti-brackets.pipe';
import { NewFindByIdPipe } from 'src/app/core/pipes/new-find-by-id.pipe';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripLabelComponent } from '../trip-label/trip-label.component';

export type TripPosition = Pick<
    OperationCurrentPositionDto,
    'prev' | 'current' | 'next'
>;

/**
 * 運用の位置（prev/current/next）を「種別チップ + 列車番号  発駅 → 着駅」で表す
 * 共通表現。横並びで、幅が足りなければ発着が次の行へ折り返す。
 *
 * operation/real-time の運用順・編成順カードに同一のマークアップが 2 つあったものを
 * 切り出した（ダッシュボードの目撃情報でも使う）。状態の導出
 * （出庫前○ / 一時入庫 / 停車中 / 入庫済△ / 走行中 / 不明？）は旧
 * operation-real-time-operation-table の判定をそのまま踏襲している。
 *
 * 見出し（「現在位置」「目撃時」など）は持たない。呼び出し側のグリッドで
 * 「履歴」等の見出しと列を揃えるため。
 */
@Component({
    selector: 'app-trip-position',
    templateUrl: './trip-position.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIconModule,
        DateFnsPipe,
        NewFindByIdPipe,
        NewAntiBracketsPipe,
        TripLabelComponent,
    ],
    host: { class: 'tw-block tw-min-w-0' },
})
export class TripPositionComponent {
    readonly position = input<TripPosition | undefined>(undefined);
    readonly stations = input<StationDetailsDto[]>([]);
    readonly tripClasses = input<TripClassDetailsDto[]>([]);
    /** 種別・列番から全線時刻表へ飛ぶリンクに使う。 */
    readonly calendarId = input<string | undefined>(undefined);
}
