import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
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
import { take } from 'rxjs/operators';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { AppButtonComponent } from '../app-button/app-button.component';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { LoadingService } from '../loading/loading.service';
import { OperationPostCardService } from './operation-post-card.service';
import {
    filterAgenciesWithFormations,
    OperationPostCardStore,
} from './operation-post-card.store';

type Form = FormGroup<{
    agencyId: FormControl<string>;
    formationOrVehicleNumber: FormControl<string>;
    operationNumber: FormControl<string>;
    timeSetting: FormControl<'currentTime' | 'specifiedTime'>;
    sightingTime: FormControl<string>;
}>;

export interface OperationPostInitialValue {
    agencyId?: string;
    formationOrVehicleNumber?: string;
    operationNumber?: string;
}

/** 運用情報の投稿フォーム。トップのカードとリアルタイムのダイアログで共用する。 */
@Component({
    selector: 'app-operation-post-form',
    templateUrl: './operation-post-form.component.html',
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
export class OperationPostFormComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #snackBar = inject(MatSnackBar);
    readonly #loading = inject(LoadingService);
    readonly #error = inject(ErrorHandlerService);
    readonly #socket = inject(SocketService);
    readonly #ga = inject(GoogleAnalyticsService);
    readonly #operationPostCardService = inject(OperationPostCardService);

    /** 初めに入れておく値（リアルタイムの行から開いたとき）。2026-10-22 */
    readonly initialValue = input<OperationPostInitialValue>({});
    /** 投稿に成功したときだけ流す（ダイアログを閉じるため） */
    readonly submitted = output<void>();
    /** 送っている間（2 回送らない・ダイアログを閉じさせないため。2026-10-23） */
    readonly submitting = signal(false);
    readonly submittingChange = output<boolean>();

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

    readonly #agencies = toSignal(OperationPostCardStore.agencies$, {
        initialValue: [],
    });
    readonly #todaysFormations = toSignal(
        inject(TodaysFormationListStateQuery).todaysFormations$,
        { initialValue: [] },
    );
    /** 所属は今日の編成を持つ会社だけ（相鉄・JR東日本・東急。2026-10-06） */
    readonly agencies = computed(() =>
        filterAgenciesWithFormations(
            this.#agencies(),
            this.#todaysFormations(),
        ),
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

    constructor() {
        this.fetchData();
        this.hookEvent();
        effect(() => {
            const initial = this.initialValue();
            // emitEvent: false。初期値の反映で valueChanges を流すと、触る前に sighting_form_start が飛ぶ
            untracked(() =>
                this.sightingForm.patchValue(initial, { emitEvent: false }),
            );
        });
    }

    async fetchData(): Promise<void> {
        await lastValueFrom(
            this.#operationPostCardService.fetchServiceAgencies(),
        );
    }

    onTimeSettingChange(value: 'currentTime' | 'specifiedTime'): void {
        this.sightingForm.get('timeSetting').setValue(value);
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

        // 投稿までの流れを GA で追う入口（カード 1 枚につき 1 回）
        this.sightingForm.valueChanges
            .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => {
                this.#ga.sendEvent('sighting_form_start');
            });
    }

    async submit(formGroupDirective: FormGroupDirective): Promise<void> {
        // 応答待ちのあいだに Enter で 2 回送らない
        if (this.submitting()) return;
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

        this.#ga.sendEvent('sighting_submit');

        this.#setSubmitting(true);
        this.#loading.open();

        const result = await tryCatchAsync<void, FetchError>(
            this.#operationPostCardService.postOperationSighting({
                agencyId,
                formationOrVehicleNumber,
                operationNumber,
                sightingTime: convertedSightingTime, // 画面上ではローカル時間で入力させるため、UTCに変換して送る
            }),
        );

        this.#loading.close();
        this.#setSubmitting(false);

        if (result.isFailure()) {
            this.#ga.sendEvent('sighting_submit_failure', {
                // GA のイベントの値は 100 文字まで
                error_message: result.error.message.slice(0, 100),
            });
            this.#error.handleError(result.error);
            this.#snackBar.open(result.error.message, 'OK', {
                duration: 3000,
            });
            return;
        }

        if (result.isSuccess()) {
            this.#ga.sendEvent('sighting_submit_success');
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

            this.#socket.emit('sendSighting', result);

            this.#operationPostCardService.emitSubmitEvent();
            this.submitted.emit();
        }
    }

    #setSubmitting(value: boolean): void {
        this.submitting.set(value);
        this.submittingChange.emit(value);
    }
}
