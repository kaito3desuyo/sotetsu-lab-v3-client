import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { StationGroup } from 'src/app/shared/station-groups.util';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { FormationDateKind } from '../../stores/timetable-formation.store';
import { FormationOperationChainItem } from '../../utils/formation-day.util';

export interface FormationHeaderSighting {
    /** 'H:mm' */
    time: string;
    operationNumber: string;
}

/**
 * 編成別時刻表の上の段。編成番号・形式・会社・その日の目撃・いまの運用と根拠・いまの位置・明日の見込み・
 * 駅を選ぶ欄・日付の欄。値は親から受け、操作は出力で返す（時刻で変わる計算は親が持つ）。
 */
@Component({
    selector: 'app-timetable-formation-header',
    templateUrl: './timetable-formation-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        LazyOptionsDirective,
        OperationNumberTagComponent,
        TripPositionComponent,
    ],
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
    readonly tomorrowBlocked = input(false);
    readonly stationGroups = input<StationGroup[]>([]);
    readonly selectedStationId = input<string | null>(null);
    readonly selectedStationName = input<string | null>(null);
    readonly date = input<string | null>(null);
    readonly dateKind = input<FormationDateKind>('today');
    /** 日付の欄で選べる最後の日 */
    readonly maxDate = input<string | null>(null);
    readonly canGoNext = input(false);

    readonly formationNumberSubmit = output<string>();
    readonly stationChange = output<string | null>();
    readonly dateChange = output<string>();
    readonly shift = output<-1 | 1>();

    protected readonly dateKindLabel = computed(() => {
        switch (this.dateKind()) {
            case 'today':
                return '今日';
            case 'tomorrow':
                return '明日（見込み）';
            default:
                return '過去の日';
        }
    });

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

    protected onInput(event: Event): void {
        this.formationNumberSubmit.emit(
            (event.target as HTMLInputElement).value,
        );
    }

    protected onDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value) this.dateChange.emit(value);
    }
}
