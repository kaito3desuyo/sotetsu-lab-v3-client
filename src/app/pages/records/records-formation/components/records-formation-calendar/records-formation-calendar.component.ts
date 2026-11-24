import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { buildMonthWeeks, shiftMonth } from '../../utils/records-month.util';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

interface CalendarEntry {
    id: string;
    /** null は運用が付いていない目撃 */
    operationNumber: string | null;
    /** 推定の運用（同日引き継ぎで写したもの）。「?」を付ける */
    inferred: boolean;
}

interface CalendarCell {
    date: string;
    day: number;
    isToday: boolean;
    /** 土曜・日曜・祝日 */
    isRed: boolean;
    /** 祝日名。祝日でなければ null */
    holidayName: string | null;
    entries: CalendarEntry[];
    /** 目撃のある日だけリンクにする */
    link: readonly unknown[] | null;
}

/**
 * 編成 1 本の月のカレンダー。各日に、その日に充当された運番を受け持った順に並べる。
 * 並べ方は過去の運用の 1 マスと同じ（2 個目から前に「›」）。
 */
@Component({
    selector: 'app-records-formation-calendar',
    templateUrl: './records-formation-calendar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        NgTemplateOutlet,
        OperationNumberTagComponent,
        RouterLink,
    ],
    host: { class: 'tw-block' },
})
export class RecordsFormationCalendarComponent {
    readonly formationNumber = input.required<string>();
    /** 'YYYY-MM' */
    readonly month = input.required<string>();
    /** 日（'YYYY-MM-DD'）ごとの目撃。無効化されたものは含めない */
    readonly sightingsByDate = input<
        Record<string, OperationSightingDetailsDto[]>
    >({});
    /** 今日（4 時区切り）の鉄道日 */
    readonly today = input<string | null>(null);
    /** 日（'YYYY-MM-DD'）ごとの祝日名 */
    readonly holidays = input<Readonly<Record<string, string>>>({});
    /** 今の月より先へは進めない */
    readonly canGoNext = input(false);

    readonly shift = output<-1 | 1>();

    protected readonly weekdays = WEEKDAYS.map((label, index) => ({
        label,
        isRed: index >= 5,
    }));

    protected readonly monthLabels = computed(() => {
        const [year, month] = this.month().split('-');
        return {
            prev: `${Number(shiftMonth(this.month(), -1).slice(5))}月`,
            current: `${year}年${Number(month)}月`,
            next: `${Number(shiftMonth(this.month(), 1).slice(5))}月`,
        };
    });

    protected readonly weeks = computed((): (CalendarCell | null)[][] => {
        const byDate = this.sightingsByDate();
        const formationNumber = this.formationNumber();
        return buildMonthWeeks(this.month()).map((week) =>
            week.map((date, column) => {
                if (!date) return null;
                const entries = (byDate[date] ?? []).map((s) => ({
                    id: s.operationSightingId,
                    // 運用が付いていない目撃は、番号を出さず「不明」と書く
                    operationNumber: s.operation?.operationNumber ?? null,
                    inferred: !!s.sightedAsOperation,
                }));
                const holidayName = this.holidays()[date] ?? null;
                return {
                    date,
                    // 月曜始まりなので、右の 2 列が土曜・日曜
                    isRed: column >= 5 || holidayName !== null,
                    holidayName,
                    day: Number(date.slice(8)),
                    isToday: date === this.today(),
                    entries,
                    link:
                        entries.length > 0
                            ? [
                                  '/timetable',
                                  'formation',
                                  { formation_number: formationNumber, date },
                              ]
                            : null,
                };
            }),
        );
    });
}
