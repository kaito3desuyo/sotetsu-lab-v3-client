import {
    ChangeDetectionStrategy,
    Component,
    Injectable,
    effect,
    inject,
    input,
    output,
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
import { parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
    OperationPastTimeSearchForm,
    OperationPastTimeSearchParam,
} from '../../types/operation-past-time.type';

@Injectable()
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
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatDateFnsModule,
        MatButtonModule,
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

    readonly referenceDate = input.required<string>();
    readonly days = input.required<number>();

    readonly clickSearch = output<OperationPastTimeSearchParam>();

    constructor() {
        effect(() => {
            const referenceDate = this.referenceDate();
            if (referenceDate) {
                this.form
                    .get('referenceDate')
                    .setValue(parse(referenceDate, 'yyyy-MM-dd', new Date()));
            } else {
                this.form.get('referenceDate').reset();
            }
        });

        effect(() => {
            const days = this.days();
            if (days) {
                this.form.get('days').setValue(days);
            } else {
                this.form.get('days').reset();
            }
        });
    }

    onClickSearch(): void {
        this.clickSearch.emit(this.form.value as OperationPastTimeSearchParam);
    }
}
