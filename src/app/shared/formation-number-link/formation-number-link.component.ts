import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { toRailwayDateKey } from 'src/app/core/utils/railway-day';

/**
 * 編成番号。編成別時刻表へのリンクにする（docs/design.md 編成番号・2026-11-13）。
 *
 * 印は列車番号（`app-trip-label`）と同じ下線で、色は周りの文字から継ぐ。字の大きさと太さも
 * 周りのまま（リアルタイム運用情報の太字は「本日中に目撃」の意味を持つので、ここでは決めない）。
 * 特定の日の記録として出す所は `date`（'yyyy-MM-dd'）か `at`（目撃時刻）を渡すと、その日で開く。
 * 編成番号が無いときは何も出さず、「不明」はリンクにしない。
 */
@Component({
    selector: 'app-formation-number-link',
    template: `
        @if (link(); as link) {
            <a
                class="tw-tabular-nums tw-underline tw-underline-offset-2 [color:inherit]"
                [routerLink]="link"
                >{{ formationNumber() }}</a
            >
        } @else if (formationNumber()) {
            <span class="tw-tabular-nums">{{ formationNumber() }}</span>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink],
})
export class FormationNumberLinkComponent {
    readonly formationNumber = input<string | null | undefined>();
    /** 'yyyy-MM-dd'。今日の見込みとして出す所では渡さない */
    readonly date = input<string | null | undefined>();
    /** 目撃時刻（ISO）。date の代わりに渡すと、日本時間の運行日（4 時前は前日）で開く */
    readonly at = input<string | null | undefined>();

    protected readonly link = computed(() => {
        const number = this.formationNumber();
        if (!number || number === '不明') return null;
        const at = this.at();
        const date = this.date() ?? (at ? toRailwayDateKey(at) : null);
        return [
            '/timetable',
            'formation',
            { formation_number: number, ...(date ? { date } : {}) },
        ];
    });
}
