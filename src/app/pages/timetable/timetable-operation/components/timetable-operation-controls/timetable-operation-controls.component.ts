import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { addDays, format, parse } from 'date-fns';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { StepNavComponent } from 'src/app/shared/step-nav/step-nav.component';
import { StepTarget } from 'src/app/shared/step-nav/step-target.type';
import { OperationViewKind } from '../../stores/timetable-operation.store';

/**
 * 運用別時刻表の操作部（操作帯の中身）。運用番号・日付（前後の日）・ダイヤの欄。
 * 日付の形では日付の欄と前後の日、ダイヤの形ではダイヤの欄を出す。どちらの形でも日付を選べば日付の形に移る。
 * 運用番号の選び方は運用行路図と同じ（そのダイヤの運用を api の順に並べる）。値は親から受け、操作は出力で返す
 */
@Component({
    selector: 'app-timetable-operation-controls',
    templateUrl: './timetable-operation-controls.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        LazyOptionsDirective,
        StepNavComponent,
    ],
    host: { class: 'tw-block' },
})
export class TimetableOperationControlsComponent {
    readonly operationNumber = input<string | null>(null);
    /** そのダイヤの運用番号（api の順） */
    readonly operationNumbers = input<readonly string[]>([]);
    readonly viewKind = input<OperationViewKind>('today');
    readonly date = input<string | null>(null);
    /** 日付の欄で選べる最後の日（今日） */
    readonly maxDate = input<string | null>(null);
    readonly calendars = input<readonly CalendarDetailsDto[]>([]);
    readonly calendarId = input<string | null>(null);

    readonly operationNumberChange = output<string>();
    readonly dateChange = output<string>();
    readonly shift = output<-1 | 1>();
    readonly calendarChange = output<string>();
    /** 日付の形から、見ている日のダイヤの形へ移る */
    readonly viewByCalendar = output<void>();

    protected readonly byCalendar = computed(
        () => this.viewKind() === 'calendar',
    );

    /** 候補。今の番号がそのダイヤに無くても、欄には今の番号を出す */
    protected readonly options = computed(() => {
        const list = this.operationNumbers();
        const current = this.operationNumber();
        return current && !list.includes(current) ? [current, ...list] : list;
    });

    protected readonly dateLabel = computed(() => {
        switch (this.viewKind()) {
            case 'today':
                return '日付（今日）';
            case 'past':
                return '日付（過去の日）';
            default:
                return '日付（選ぶとその日の記録を出します）';
        }
    });

    protected calendarLabel(calendar: CalendarDetailsDto): string {
        return formatCalendarSummaryLabel(calendar);
    }

    protected readonly selectedCalendar = computed(
        () =>
            this.calendars().find((c) => c.calendarId === this.calendarId()) ??
            null,
    );

    /** 前後の日のボタン。名前は「11/12」の形。今日より先へは送らない */
    protected readonly neighborDays = computed(
        (): { prev: StepTarget[]; next: StepTarget[] } => {
            const date = this.date();
            if (!date || this.byCalendar()) return { prev: [], next: [] };
            const day = parse(date, 'yyyy-MM-dd', new Date());
            const target = (delta: -1 | 1): StepTarget => ({
                id: String(delta),
                label: format(addDays(day, delta), 'M/d'),
            });
            return {
                prev: [target(-1)],
                next: this.viewKind() === 'today' ? [] : [target(1)],
            };
        },
    );

    protected onStep(target: StepTarget): void {
        this.shift.emit(target.id === '1' ? 1 : -1);
    }

    protected onDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value) this.dateChange.emit(value);
    }
}
