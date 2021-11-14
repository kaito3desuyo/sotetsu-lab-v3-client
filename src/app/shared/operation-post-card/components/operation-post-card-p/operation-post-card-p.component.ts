import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { RxState } from '@rx-angular/state';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { IOperationPostCardForm } from '../../interfaces/operation-post-card-form.interface';

type State = {
    agencies: AgencyDetailsDto[];
};

@Component({
    selector: 'app-operation-post-card-p',
    templateUrl: './operation-post-card-p.component.html',
    styleUrls: ['./operation-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationPostCardPComponent {
    readonly sightingForm = this.fb.group({
        agencyId: ['', Validators.required],
        formationOrVehicleNumber: ['', Validators.required],
        operationNumber: ['', Validators.required],
        timeSetting: ['currentTime', Validators.required],
        sightingTime: [{ value: '', disabled: true }, Validators.required],
    });

    readonly agencies$ = this.state.select('agencies');

    readonly onChangedInputAgencies$ = new EventEmitter<AgencyDetailsDto[]>();

    @Input() set agencies(agencies: AgencyDetailsDto[]) {
        this.onChangedInputAgencies$.next(agencies);
    }
    @Output() submitSighting = new EventEmitter<IOperationPostCardForm>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly state: RxState<State>
    ) {
        this.state.connect('agencies', this.onChangedInputAgencies$);
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
            }
        );
    }

    onClickSubmit(): void {
        this.submitSighting.emit(this.sightingForm.value);
        this.sightingForm.reset({
            agencyId: '',
            formationOrVehicleNumber: '',
            operationNumber: '',
            timeSetting: 'currentTime',
            sightingTime: '',
        });
    }
}
