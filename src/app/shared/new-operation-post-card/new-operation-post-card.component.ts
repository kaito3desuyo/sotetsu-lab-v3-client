import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormGroupDirective,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { addDays, getHours, parse, subDays } from 'date-fns';
import { lastValueFrom } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { TodaysOperationListStateQuery } from 'src/app/global-states/todays-operation-list.state';
import { AppButtonComponent } from '../app-button/app-button.component';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { LoadingService } from '../app-shared/loading/loading.service';
import { NewOperationPostCardService } from './new-operation-post-card.service';
import { OperationPostCardStore } from './new-operation-post-card.store';

type Form = FormGroup<{
    agencyId: FormControl<string>;
    formationOrVehicleNumber: FormControl<string>;
    operationNumber: FormControl<string>;
    timeSetting: FormControl<'currentTime' | 'specifiedTime'>;
    sightingTime: FormControl<string>;
}>;

/** 編成番号/車両番号トグルの選択肢（98 G4。UI表示切替のみ・formControl は共通のまま） */
type FormationOrVehicleType = 'formation' | 'vehicle';

@Component({
    selector: 'app-new-operation-post-card',
    templateUrl: './new-operation-post-card.component.html',
    styleUrl: './new-operation-post-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSnackBarModule,
        SegmentToggleComponent,
        AppButtonComponent,
    ],
})
export class NewOperationPostCardComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #snackBar = inject(MatSnackBar);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #socket = inject(SocketService);
    readonly #newOperationPostCardService = inject(NewOperationPostCardService);
    readonly #todaysOperationListStateQuery = inject(
        TodaysOperationListStateQuery,
    );

    readonly sightingForm: Form = this.#fb.group({
        agencyId: this.#fb.control('', [Validators.required]),
        formationOrVehicleNumber: this.#fb.control('', [Validators.required]),
        operationNumber: this.#fb.control('', [Validators.required]),
        timeSetting: this.#fb.control<'currentTime' | 'specifiedTime'>(
            'currentTime',
            [Validators.required],
        ),
        sightingTime: this.#fb.control({ value: '', disabled: true }, [
            Validators.required,
        ]),
    });

    readonly agencies = toSignal(OperationPostCardStore.agencies$);
    readonly operations = toSignal(
        this.#todaysOperationListStateQuery.todaysOperationsSorted$,
        { initialValue: [] },
    );

    readonly timeSetting = toSignal(
        this.sightingForm.get('timeSetting').valueChanges,
        { initialValue: this.sightingForm.get('timeSetting').value },
    );
    readonly timeSettingOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: 'currentTime', label: '現在時刻' },
        { value: 'specifiedTime', label: '時刻指定' },
    ];

    /** 編成番号/車両番号トグル（98 G4 DoD: トグル復元）。API に送る formControl は変えず、入力欄のラベルのみ切替 */
    readonly formationOrVehicleType = signal<FormationOrVehicleType>(
        'formation',
    );
    readonly formationOrVehicleTypeOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: 'formation', label: '編成番号' },
        { value: 'vehicle', label: '車両番号' },
    ];

    constructor() {
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        await lastValueFrom(
            this.#newOperationPostCardService.fetchServiceAgencies(),
        );
    }

    onTimeSettingChange(value: 'currentTime' | 'specifiedTime'): void {
        this.sightingForm.get('timeSetting').setValue(value);
    }

    onFormationOrVehicleTypeChange(value: FormationOrVehicleType): void {
        this.formationOrVehicleType.set(value);
    }

    hookEvent(): void {
        this.sightingForm
            .get('timeSetting')
            .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((value) => {
                switch (value) {
                    case 'currentTime':
                        this.sightingForm.get('sightingTime').disable();
                        break;
                    case 'specifiedTime':
                        this.sightingForm.get('sightingTime').enable();
                        break;
                }
            });
    }

    async submit(formGroupDirective: FormGroupDirective): Promise<void> {
        const {
            agencyId,
            formationOrVehicleNumber,
            operationNumber,
            timeSetting,
            sightingTime,
        } = this.sightingForm.value;

        const now = new Date();

        let convertedSightingTime = now.toISOString();
        if (timeSetting === 'specifiedTime') {
            const parsedSightingTime = parse(sightingTime, 'HH:mm', now);
            const isLateNight = getHours(now) < 4;

            const adjustedSightingTime = isLateNight
                ? subDays(
                      parsedSightingTime,
                      getHours(parsedSightingTime) >= 4 ? 1 : 0,
                  )
                : addDays(
                      parsedSightingTime,
                      getHours(parsedSightingTime) < 4 ? 1 : 0,
                  );

            convertedSightingTime = adjustedSightingTime.toISOString();
        }

        this.#loading.open();

        const result = await tryCatchAsync<void, FetchError>(
            this.#newOperationPostCardService.postOperationSighting({
                agencyId,
                formationOrVehicleNumber,
                operationNumber,
                sightingTime: convertedSightingTime, // 画面上ではローカル時間で入力させるため、UTCに変換して送る
            }),
        );

        this.#loading.close();

        if (result.isFailure()) {
            this.#error.handleError(result.error);
            this.#snackBar.open(result.error.message, 'OK', {
                duration: 3000,
            });
            return;
        }

        if (result.isSuccess()) {
            this.#snackBar.open('目撃情報を投稿しました', 'OK', {
                duration: 3000,
            });

            formGroupDirective.resetForm({
                agencyId: '',
                formationOrVehicleNumber: '',
                operationNumber: '',
                timeSetting: 'currentTime',
                sightingTime: '',
            });
            this.formationOrVehicleType.set('formation');

            this.#socket.emit('sendSighting', result);

            this.#newOperationPostCardService.emitSubmitEvent();
        }
    }
}
