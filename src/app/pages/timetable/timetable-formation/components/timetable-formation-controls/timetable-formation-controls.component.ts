import { addDays, format, parse } from 'date-fns';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
    signal,
} from '@angular/core';
import {
    MatAutocompleteModule,
    MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { StationGroup } from 'src/app/shared/station-groups.util';
import { StepNavComponent } from 'src/app/shared/step-nav/step-nav.component';
import { StepTarget } from 'src/app/shared/step-nav/step-target.type';
import { FormationDateKind } from '../../stores/timetable-formation.store';
import { groupFormationOptions } from '../../utils/formation-options.util';

/**
 * 編成別時刻表の操作部（操作帯の中身）。編成番号・駅で絞る・日付の欄。
 * 編成番号は会社と形式ごとにまとめた一覧から選ぶか、打って絞り込む（ユーザー指示 2026-11-12）。
 * 値は親から受け、操作は出力で返す。
 */
@Component({
    selector: 'app-timetable-formation-controls',
    templateUrl: './timetable-formation-controls.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatAutocompleteModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        LazyOptionsDirective,
        StepNavComponent,
    ],
    host: { class: 'tw-block' },
})
export class TimetableFormationControlsComponent {
    readonly formationNumber = input<string | null>(null);
    /** 候補にする編成（会社の順・番号順に並べたもの） */
    readonly formations = input<readonly FormationDetailsDto[]>([]);
    readonly agencies = input<readonly AgencyDetailsDto[]>([]);
    /** 編成が見つかったときだけ駅の欄を出す */
    readonly showStation = input(false);
    readonly stationGroups = input<StationGroup[]>([]);
    readonly selectedStationId = input<string | null>(null);
    readonly selectedStationName = input<string | null>(null);
    readonly date = input<string | null>(null);
    readonly dateKind = input<FormationDateKind>('today');
    /** 日付の欄で選べる最後の日 */
    readonly maxDate = input<string | null>(null);
    readonly canGoNext = input(false);
    readonly tomorrowBlocked = input(false);

    readonly formationNumberSubmit = output<string>();
    readonly stationChange = output<string | null>();
    readonly dateChange = output<string>();
    readonly shift = output<-1 | 1>();

    /** 編成番号の欄に打った文字。欄に入るたびに空に戻し、全部の候補を出す */
    protected readonly query = signal('');
    protected readonly groups = computed(() =>
        groupFormationOptions(this.formations(), this.agencies(), this.query()),
    );

    protected readonly dateKindLabel = computed(() => {
        switch (this.dateKind()) {
            case 'today':
                return '今日';
            case 'tomorrow':
                return '明日・見込み';
            default:
                return '過去の日';
        }
    });

    /** 前後の日のボタン。名前は「11/12」の形。次の日へ送れないときは出さない */
    protected readonly neighborDays = computed(
        (): { prev: StepTarget[]; next: StepTarget[] } => {
            const date = this.date();
            if (!date) return { prev: [], next: [] };
            const day = parse(date, 'yyyy-MM-dd', new Date());
            const target = (delta: -1 | 1): StepTarget => ({
                id: String(delta),
                label: format(addDays(day, delta), 'M/d'),
            });
            return {
                prev: [target(-1)],
                next: this.canGoNext() ? [target(1)] : [],
            };
        },
    );

    /** 全部の候補を出し、今の番号を選んだ状態にする（打てば置き換わる。セレクトボックスと同じ） */
    protected onFocus(input: HTMLInputElement): void {
        this.query.set('');
        input.select();
    }

    /**
     * 欄を離れたら、欄を今の編成番号に戻す。候補を選ばずに離れると打ちかけの文字が残り、
     * 要約やカードの番号と食い違うため。選んだときは移った先の番号が [value] で入り直す。
     * 一覧を閉じたとき（closed）では戻さない。候補が 0 件になると打っている途中でも閉じるため。
     */
    protected onBlur(input: HTMLInputElement): void {
        input.value = this.formationNumber() ?? '';
    }

    protected onQuery(event: Event): void {
        this.query.set((event.target as HTMLInputElement).value);
    }

    /** 候補を選んでいる Enter は optionSelected に任せ、選んでいないときは打った値で進む */
    protected onEnter(event: Event, trigger: MatAutocompleteTrigger): void {
        if (trigger.activeOption) return;
        const value = (event.target as HTMLInputElement).value.trim();
        if (value) {
            trigger.closePanel();
            this.formationNumberSubmit.emit(value);
        }
    }

    protected onStep(target: StepTarget): void {
        this.shift.emit(target.id === '1' ? 1 : -1);
    }

    protected onDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value) this.dateChange.emit(value);
    }
}
