import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { FormationDateKind } from '../../stores/timetable-formation.store';
import { FormationOperationChainItem } from '../../utils/formation-day.util';

export interface FormationHeaderSighting {
    /** 'HH:mm' */
    time: string;
    operationNumber: string;
}

/**
 * 編成別時刻表の操作帯の下のカード。編成番号・形式・会社・その日の目撃・いまの運用と根拠・いまの位置・明日の見込み。
 * 操作の欄は操作帯（timetable-formation-controls）にある。値は親から受ける（時刻で変わる計算は親が持つ）。
 */
@Component({
    selector: 'app-timetable-formation-header',
    templateUrl: './timetable-formation-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [OperationNumberTagComponent, TripPositionComponent],
    host: { class: 'tw-block' },
})
export class TimetableFormationHeaderComponent {
    readonly formationNumber = input<string | null>(null);
    readonly formation = input<FormationDetailsDto | null>(null);
    /** 「8000系・相鉄」（形式・会社） */
    readonly annotation = input('');
    readonly sightings = input<FormationHeaderSighting[]>([]);
    readonly currentOperationNumber = input<string | null>(null);
    readonly currentBasisLabel = input<string | null>(null);
    /** 運用番号に「?」を付けるか */
    readonly currentInferred = input(false);
    /** その日にたどった運用（「16K → 15K」）。2 つ以上あるときは 1 つのチップの代わりに並べる */
    readonly operationChain = input<FormationOperationChainItem[]>([]);
    readonly position = input<OperationCurrentPositionDto | null>(null);
    readonly positionStations = input<StationDetailsDto[]>([]);
    readonly positionTripClasses = input<TripClassDetailsDto[]>([]);
    readonly positionLinks = input<OperationItineraryLinkDto[]>([]);
    readonly calendarId = input<string | undefined>(undefined);
    /** 明日の見込みの運用番号。今日で明日を選べるときだけ親が渡す */
    readonly tomorrowOperationNumber = input<string | null>(null);
    readonly dateKind = input<FormationDateKind>('today');

    protected readonly operationHeading = computed(() =>
        this.dateKind() === 'today'
            ? 'いまの運用'
            : this.dateKind() === 'tomorrow'
              ? '見込みの運用'
              : 'この日の運用',
    );

    protected readonly sightingHeading = computed(() =>
        this.dateKind() === 'today' ? '今日の目撃' : 'この日の目撃',
    );
}
