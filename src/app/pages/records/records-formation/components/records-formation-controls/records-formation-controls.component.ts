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
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { groupFormationOptions } from 'src/app/pages/timetable/timetable-formation/utils/formation-options.util';

/**
 * 編成の記録の操作部（操作帯の中身）。編成番号と、前の月・次の月。
 * 編成番号の欄は編成別時刻表と同じ振る舞い（候補から選ぶか、打って絞る）。
 * 値は親から受け、操作は出力で返す。
 */
@Component({
    selector: 'app-records-formation-controls',
    templateUrl: './records-formation-controls.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatAutocompleteModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
    ],
    host: { class: 'tw-block' },
})
export class RecordsFormationControlsComponent {
    readonly formationNumber = input<string | null>(null);
    /** 候補にする編成（会社の順・番号順に並べたもの） */
    readonly formations = input<readonly FormationDetailsDto[]>([]);
    readonly agencies = input<readonly AgencyDetailsDto[]>([]);
    /** 'YYYY-MM' */
    readonly month = input<string | null>(null);
    /** 今の月より先へは進めない */
    readonly canGoNext = input(false);

    readonly formationNumberSubmit = output<string>();
    readonly shift = output<-1 | 1>();

    /** 編成番号の欄に打った文字。欄に入るたびに空に戻し、全部の候補を出す */
    protected readonly query = signal('');
    protected readonly groups = computed(() =>
        groupFormationOptions(this.formations(), this.agencies(), this.query()),
    );
    protected readonly monthLabel = computed(() => {
        const [year, month] = (this.month() ?? '').split('-');
        return year && month ? `${year}年${Number(month)}月` : '';
    });

    /** 全部の候補を出し、今の番号を選んだ状態にする（打てば置き換わる） */
    protected onFocus(input: HTMLInputElement): void {
        this.query.set('');
        input.select();
    }

    /** 候補を選ばずに欄を離れたら、欄を今の編成番号に戻す */
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
}
