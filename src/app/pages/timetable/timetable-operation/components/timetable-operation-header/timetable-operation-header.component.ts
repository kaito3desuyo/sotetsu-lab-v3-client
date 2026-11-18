import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { FormationNumberLinkComponent } from 'src/app/shared/formation-number-link/formation-number-link.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { OperationViewKind } from '../../stores/timetable-operation.store';

export interface OperationHeaderSighting {
    /** 'HH:mm' */
    time: string;
    formationNumber: string;
}

/**
 * 運用別時刻表の操作帯の下のカード。運用番号・ダイヤの名前・いまの編成・いまの位置・その日の目撃・運用行路図へのリンク。
 * 日付の形の今日だけ、いまの編成と位置を出す。ダイヤの形では編成と目撃を出さない。値は親から受ける
 */
@Component({
    selector: 'app-timetable-operation-header',
    templateUrl: './timetable-operation-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormationNumberLinkComponent,
        OperationNumberTagComponent,
        RouterLink,
        TripPositionComponent,
    ],
    host: { class: 'tw-block' },
})
export class TimetableOperationHeaderComponent {
    readonly operationNumber = input.required<string>();
    readonly operationId = input<string | null>(null);
    /** 「2026/3/14改正 平日」 */
    readonly calendarLabel = input('');
    readonly viewKind = input<OperationViewKind>('today');
    readonly date = input<string | null>(null);
    /** いまの編成（今日だけ）。分からなければ null で「編成不明」 */
    readonly currentFormationNumber = input<string | null>(null);
    readonly currentInferred = input(false);
    readonly sightings = input<OperationHeaderSighting[]>([]);
    readonly position = input<OperationCurrentPositionDto | null>(null);
    readonly positionStations = input<StationDetailsDto[]>([]);
    readonly positionTripClasses = input<TripClassDetailsDto[]>([]);
    readonly calendarId = input<string | undefined>(undefined);
}
