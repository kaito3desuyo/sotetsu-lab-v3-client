import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    Injectable,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { format, parse } from 'date-fns';
import { ja } from 'date-fns/locale';
import { omitBy } from 'es-toolkit';
import { OperationPastTimeStateQuery } from '../../states/operation-past-time.state';
import { OperationPastTimeSearchForm } from '../../types/operation-past-time.type';

@Injectable()
class CustomDateFnsAdapter extends DateFnsAdapter {
    override getDateNames(): string[] {
        return [...Array(31).keys()].map((i) => String(i + 1));
    }
}

@Component({
    selector: 'app-operation-past-time-search-form',
    templateUrl: './operation-past-time-search-form.component.html',
    styleUrl: './operation-past-time-search-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatDateFnsModule,
        MatButtonModule,
        MatSlideToggleModule,
    ],
    providers: [
        { provide: MAT_DATE_LOCALE, useValue: ja },
        {
            provide: DateAdapter,
            useClass: CustomDateFnsAdapter,
        },
    ],
})
export class OperationPastTimeSearchFormComponent {
    readonly #router = inject(Router);
    readonly #fb = inject(FormBuilder);
    readonly #operationPastTimeStateQuery = inject(OperationPastTimeStateQuery);

    readonly maxDate = new Date();
    readonly form: OperationPastTimeSearchForm = this.#fb.group({
        referenceDate: this.#fb.control<Date | null>(null, [
            Validators.required,
        ]),
        days: this.#fb.control<number | null>(null, [
            Validators.required,
            Validators.min(0),
            Validators.max(30),
        ]),
        includeInvalidated: this.#fb.control<boolean>(false),
    });

    readonly referenceDate = toSignal(
        this.#operationPastTimeStateQuery.referenceDate$,
    );
    readonly days = toSignal(this.#operationPastTimeStateQuery.days$);
    readonly includeInvalidated = toSignal(
        this.#operationPastTimeStateQuery.includeInvalidated$,
    );

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

        effect(() => {
            const includeInvalidated = this.includeInvalidated();
            this.form.get('includeInvalidated').setValue(includeInvalidated);
        });
    }

    onClickSearch(): void {
        if (this.form.invalid) {
            return;
        }

        const referenceDate = this.form.get('referenceDate').value;
        const days = this.form.get('days').value;
        const includeInvalidated = this.form.get('includeInvalidated').value;

        if (!referenceDate || !days) {
            return;
        }

        this.#router.navigate([
            'operation',
            'past-time',
            omitBy(
                {
                    reference_date: format(referenceDate, 'yyyy-MM-dd'),
                    days: days,
                    include_invalidated: includeInvalidated ? true : undefined,
                },
                (v) => v === undefined,
            ),
        ]);
    }
}
