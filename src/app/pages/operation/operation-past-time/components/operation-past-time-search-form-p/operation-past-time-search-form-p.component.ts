import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
    DateFnsAdapter,
    MatDateFnsModule,
} from '@angular/material-date-fns-adapter';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RxIf } from '@rx-angular/template/if';
import { parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
    OperationPastTimeSearchForm,
    OperationPastTimeSearchParam,
} from '../../types/operation-past-time.type';

class CustomDateFnsAdapter extends DateFnsAdapter {
    override getDateNames(): string[] {
        return [...Array(31).keys()].map((i) => String(i + 1));
    }
}

@Component({
    standalone: true,
    selector: 'app-operation-past-time-search-form-p',
    templateUrl: './operation-past-time-search-form-p.component.html',
    styleUrls: ['./operation-past-time-search-form-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatDateFnsModule,
        MatButtonModule,
        RxIf,
    ],
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: ja },
        {
            provide: DateAdapter,
            useClass: CustomDateFnsAdapter,
        },
    ],
})
export class OperationPastTimeSearchFormPComponent {
    readonly #fb = inject(FormBuilder);

    readonly maxDate = new Date();
    readonly form: OperationPastTimeSearchForm = this.#fb.group({
        referenceDate: this.#fb.control(null as Date, [Validators.required]),
        days: this.#fb.control(null as number, [
            Validators.required,
            Validators.min(0),
            Validators.max(30),
        ]),
    });

    @Input() set referenceDate(dateString: string) {
        this.form
            .get('referenceDate')
            .setValue(parse(dateString, 'yyyy-MM-dd', new Date()));
    }

    @Input() set days(days: number) {
        this.form.get('days').setValue(days);
    }

    @Output() readonly clickSearch =
        new EventEmitter<OperationPastTimeSearchParam>();

    onClickSearch(): void {
        this.clickSearch.emit(this.form.value as OperationPastTimeSearchParam);
    }
}
