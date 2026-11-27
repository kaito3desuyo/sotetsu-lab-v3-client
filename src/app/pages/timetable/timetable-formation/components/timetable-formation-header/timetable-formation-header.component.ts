import {
    OperationTimetableLinkAt,
    operationTimetableLink,
} from 'src/app/core/utils/operation-timetable-link';
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
import { RouterLink } from '@angular/router';
import { FormationDateKind } from '../../stores/timetable-formation.store';
import { FormationOperationChainItem } from '../../utils/formation-day.util';
import { routeDiagramLink } from '../../utils/formation-display.util';

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
    imports: [OperationNumberTagComponent, RouterLink, TripPositionComponent],
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
    /** 明日の見込みの運用 ID（明日の暦の運用なので、今日の番号の対応とは別に受ける） */
    readonly tomorrowOperationId = input<string | null>(null);
    /** 運用番号 → 運用 ID（チップを行路図へのリンクにする。ストアの operationIdByNumber） */
    readonly operationIdByNumber = input<Record<string, string>>({});
    protected readonly routeDiagramLink = routeDiagramLink;
    /** 運用番号のチップの飛び先（運用別時刻表）。見ている日、明日の見込みならそのダイヤ */
    readonly operationLinkAt = input<OperationTimetableLinkAt>('today');
    protected readonly operationTimetableLink = operationTimetableLink;
    readonly dateKind = input<FormationDateKind>('today');

    /** その編成の記録（月ごとのカレンダー）へのリンク。見ている日があればその月で開く */
    protected readonly recordsLink = computed(() => {
        const number = this.formationNumber();
        if (!number) return null;
        const at = this.operationLinkAt();
        const date = typeof at === 'object' && 'date' in at ? at.date : null;
        const month = date?.slice(0, 7);
        return [
            '/records',
            'formation',
            month
                ? { formation_number: number, month }
                : { formation_number: number },
        ];
    });

    protected readonly operationHeading = computed(() =>
        this.dateKind() === 'today'
            ? '現在の運用'
            : this.dateKind() === 'tomorrow'
              ? '見込みの運用'
              : 'この日の運用',
    );

    protected readonly sightingHeading = computed(() =>
        this.dateKind() === 'today' ? '今日の目撃' : 'この日の目撃',
    );
}
