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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';
import { StationGroup } from 'src/app/shared/station-groups.util';
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
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
        LazyOptionsDirective,
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
                return '明日（見込み）';
            default:
                return '過去の日';
        }
    });

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

    protected onDate(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        if (value) this.dateChange.emit(value);
    }
}
