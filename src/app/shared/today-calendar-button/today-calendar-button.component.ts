import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';

/**
 * ダイヤの選択欄の右に置く「今日」（docs/design.md「今日のダイヤ」）。
 * 今日のダイヤのどれかを見ている間は押せない。押すと今日の先頭のダイヤを流す。
 */
@Component({
    selector: 'app-today-calendar-button',
    template: `
        <button
            mat-stroked-button
            type="button"
            [disabled]="disabled()"
            (click)="onClick()"
        >
            <mat-icon>today</mat-icon>
            今日
        </button>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
    host: { class: 'tw-shrink-0' },
})
export class TodayCalendarButtonComponent {
    readonly #query = inject(TodaysCalendarListStateQuery);
    readonly calendarId = input<string | null | undefined>();
    readonly selectToday = output<string>();

    readonly #todaysCalendarIds = toSignal(this.#query.todaysCalendarIds$, {
        initialValue: [] as string[],
    });
    readonly #todaysCalendarId = toSignal(this.#query.todaysCalendarId$);

    readonly disabled = computed(() => {
        const calendarId = this.calendarId();
        return (
            !this.#todaysCalendarId() ||
            (!!calendarId && this.#todaysCalendarIds().includes(calendarId))
        );
    });

    onClick(): void {
        const today = this.#todaysCalendarId();
        if (today) this.selectToday.emit(today);
    }
}
