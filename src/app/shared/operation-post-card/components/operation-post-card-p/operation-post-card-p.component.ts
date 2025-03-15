import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RxState } from '@rx-angular/state';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';

type Form = FormGroup<{
    agencyId: FormControl<string>;
    formationOrVehicleNumber: FormControl<string>;
    operationNumber: FormControl<string>;
    timeSetting: FormControl<'currentTime' | 'specifiedTime'>;
    sightingTime: FormControl<string>;
}>;

@Component({
    selector: 'app-operation-post-card-p',
    templateUrl: './operation-post-card-p.component.html',
    styleUrls: ['./operation-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatSelectModule,
        MatButtonModule,
    ],
    providers: [RxState]
})
export class OperationPostCardPComponent {
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #state = inject<RxState<{}>>(RxState);

    readonly sightingForm: Form = this.#fb.group({
        agencyId: this.#fb.control('', [Validators.required]),
        formationOrVehicleNumber: this.#fb.control('', [Validators.required]),
        operationNumber: this.#fb.control('', [Validators.required]),
        timeSetting: this.#fb.control<'currentTime' | 'specifiedTime'>(
            'currentTime',
            [Validators.required],
        ),
        sightingTime: this.#fb.control('', [Validators.required]),
    });

    readonly agencies = input.required<AgencyDetailsDto[]>();
    readonly lastSubmittedAt = input.required<number>();

    readonly submitSighting = output<IOperationPostCardForm>();

    constructor() {
        this.#state.hold(
            this.sightingForm.get('timeSetting').valueChanges,
            (timeSetting) => {
                switch (timeSetting) {
                    case 'currentTime':
                        this.sightingForm.get('sightingTime').disable();
                        break;
                    case 'specifiedTime':
                        this.sightingForm.get('sightingTime').enable();
                        break;
                }
            },
        );

        this.#state.hold(toObservable(this.lastSubmittedAt), () => {
            this.sightingForm.reset({
                agencyId: '',
                formationOrVehicleNumber: '',
                operationNumber: '',
                timeSetting: 'currentTime',
                sightingTime: '',
            });
        });
    }
}
