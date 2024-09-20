import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';

type State = {
    agencies: AgencyDetailsDto[];
};

@Component({
    standalone: true,
    selector: 'app-operation-post-card-p',
    templateUrl: './operation-post-card-p.component.html',
    styleUrls: ['./operation-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatSelectModule,
        MatButtonModule,
        RxLet,
        RxFor,
        RxIf,
    ],
})
export class OperationPostCardPComponent {
    private readonly fb = inject(FormBuilder);
    private readonly state = inject<RxState<State>>(RxState);

    readonly sightingForm = this.fb.nonNullable.group({
        agencyId: ['', Validators.required],
        formationOrVehicleNumber: ['', Validators.required],
        operationNumber: ['', Validators.required],
        timeSetting: ['currentTime', Validators.required],
        sightingTime: [{ value: '', disabled: true }, Validators.required],
    });

    readonly vm$ = this.state.select();

    readonly onChangedInputAgencies$ = new EventEmitter<AgencyDetailsDto[]>();
    readonly onChangedInputSubmitOperationSightingEvent$ =
        new EventEmitter<void>();

    readonly onSubmittedSighting$ = new Subject<void>();

    @Input() set agencies(agencies: AgencyDetailsDto[]) {
        this.onChangedInputAgencies$.next(agencies);
    }
    @Input() set submitOperationSightingEvent(event: void) {
        this.onChangedInputSubmitOperationSightingEvent$.next(event);
    }

    @Output() submitSighting = new EventEmitter<IOperationPostCardForm>();

    constructor() {
        this.state.connect(
            'agencies',
            this.onChangedInputAgencies$.asObservable(),
        );

        this.state.hold(
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

        this.state.hold(
            this.onChangedInputSubmitOperationSightingEvent$.asObservable(),
            () => {
                this.sightingForm.reset({
                    agencyId: '',
                    formationOrVehicleNumber: '',
                    operationNumber: '',
                    timeSetting: 'currentTime',
                    sightingTime: '',
                });
            },
        );

        this.state.hold(this.onSubmittedSighting$.asObservable(), () => {
            this.submitSighting.emit(this.sightingForm.value);
        });
    }
}
