import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import dayjs from 'dayjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';

/**
 * カードの上端に置くダイヤの帯。平日は青・土休日は赤（styles.scss の .weekday / .holiday）。
 * 1 行目に改正日（ダイヤの選択欄と同じ「2026/3/14改正」）、2 行目にダイヤ名と suffix
 * （「上り時刻表」「11運」など）を白文字で出す。カードの角丸は親の overflow-clip で効かせる。
 */
@Component({
    selector: 'app-calendar-band',
    template: `
        <h2
            class="tw-m-0 tw-text-base tw-font-normal tw-leading-5 tw-text-white"
        >
            {{ revisionLabel() }}<br />
            {{ calendar().calendarName }} {{ suffix() }}
        </h2>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'tw-flex tw-h-12 tw-flex-row tw-items-center tw-justify-start tw-px-4',
        '[class.weekday]': '!isHolidayCalendar()',
        '[class.holiday]': 'isHolidayCalendar()',
    },
})
export class CalendarBandComponent {
    readonly calendar =
        input.required<
            Pick<
                CalendarDetailsDto,
                'calendarName' | 'startDate' | 'saturday' | 'sunday'
            >
        >();
    readonly suffix = input('');

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar.sunday || !!calendar.saturday;
    });

    readonly revisionLabel = computed(() => {
        const startDate = this.calendar().startDate;
        return startDate
            ? `${dayjs(startDate, 'YYYY-MM-DD').format('YYYY/M/D')}改正`
            : '';
    });
}
