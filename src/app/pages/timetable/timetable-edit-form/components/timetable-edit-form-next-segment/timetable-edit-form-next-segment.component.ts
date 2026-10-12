import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { of, switchMap } from 'rxjs';
import { SecondsToHhmmPipe } from 'src/app/core/pipes/seconds-to-hhmm.pipe';
import { NextSegmentCandidateDto } from 'src/app/libs/operation/usecase/dtos/next-segment-candidate.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ITimetableEditFormTrip } from '../../interfaces/timetable-edit-form.interface';

/** `HH:mm` を運行日の 0 時からの秒にする。4 時前は 2 日目として 86400 を足す（保存時の 2 日目判定と同じ） */
export function arrivalTimeToSeconds(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return (h < 4 ? 86400 : 0) + h * 3600 + m * 60;
}

/**
 * 区間が 1 つの列車の「次の運用」。車両が運番を離れて次に入る区間を、
 * 終着駅・到着時刻のあとに始まる区間から選ぶ。
 */
@Component({
    selector: 'app-timetable-edit-form-next-segment',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        SecondsToHhmmPipe,
    ],
    template: `
        <mat-form-field class="tw-w-full" subscriptSizing="dynamic">
            <mat-select
                aria-label="次の運用（車両が運番を離れるときだけ）"
                [formControl]="tripForm().controls.nextTripOperationListId"
                [canSelectNullableOptions]="true"
            >
                <mat-option [value]="null">なし</mat-option>
                @if (currentNextIsMissing()) {
                    <mat-option [value]="currentNext()">現在の設定</mat-option>
                }
                @for (c of candidates(); track c.tripOperationListId) {
                    <mat-option
                        [value]="c.tripOperationListId"
                        [disabled]="isBlocked(c)"
                    >
                        {{ c.operationNumber }}　{{
                            c.startSeconds | secondsToHhmm
                        }}{{ blockedLabel(c) }}
                    </mat-option>
                }
            </mat-select>
        </mat-form-field>
    `,
})
export class TimetableEditFormNextSegmentComponent {
    readonly #operationService = inject(OperationService);

    readonly tripForm = input.required<ITimetableEditFormTrip>();
    /** 終着駅 */
    readonly stationId = input<string | null>(null);
    /** 終着駅の到着時刻（`HH:mm`） */
    readonly arrivalTime = input<string | null>(null);

    /** 保存されている「次の運用」（元の区間から読む。選び直しても動かない） */
    readonly currentNext = computed(
        () =>
            this.tripForm().controls.tripOperationLists.value[0]
                ?.nextTripOperationListId ?? null,
    );

    readonly candidates = toSignal(
        toObservable(
            computed(() => ({
                calendarId: this.tripForm().controls.calendarId.value,
                stationId: this.stationId(),
                arrivalTime: this.arrivalTime(),
            })),
        ).pipe(
            switchMap(({ calendarId, stationId, arrivalTime }) =>
                calendarId && stationId && arrivalTime
                    ? this.#operationService.findManyNextSegmentCandidates({
                          calendarId,
                          stationId,
                          afterSeconds: arrivalTimeToSeconds(arrivalTime),
                      })
                    : of([] as NextSegmentCandidateDto[]),
            ),
        ),
        { initialValue: [] as NextSegmentCandidateDto[] },
    );

    /** 今の値が候補に無い（駅や時刻を直した等）。黙って外さず「現在の設定」で残す */
    readonly currentNextIsMissing = computed(() => {
        const current = this.currentNext();
        return (
            current !== null &&
            !this.candidates().some((c) => c.tripOperationListId === current)
        );
    });

    /** ほかの区間の次になっていて選べない（今の値と同じものは選べる） */
    isBlocked(candidate: NextSegmentCandidateDto): boolean {
        return (
            candidate.isTaken &&
            candidate.tripOperationListId !== this.currentNext()
        );
    }

    /** 選べない理由。列車の途中でつながるもの（決まり 1）は別の文言にする */
    blockedLabel(candidate: NextSegmentCandidateDto): string {
        if (!this.isBlocked(candidate)) {
            return '';
        }
        return candidate.isFixedByTripBlock
            ? '（列車の途中でつながる）'
            : '（ほかの区間の次）';
    }
}
