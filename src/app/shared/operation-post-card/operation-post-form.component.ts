import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    output,
    signal,
    untracked,
    viewChild,
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { FeatureFlagState } from 'src/app/global-states/feature-flag.state';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { TodaysListsRefresher } from 'src/app/global-states/todays-lists-refresher';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { AppButtonComponent } from '../app-button/app-button.component';
import { formatFormationAnnotation } from '../formation-annotation.util';
import { LoadingService } from '../loading/loading.service';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';
import { PickableTrain } from '../train-picker/pickable-train.interface';
import { TrainPickerComponent } from '../train-picker/train-picker.component';
import { OperationPostCardService } from './operation-post-card.service';
import {
    filterAgenciesWithFormations,
    OperationPostCardStore,
} from './operation-post-card.store';
import { OperationPostSource } from './operation-post-source.type';
import {
    FORMATION_NOT_IN_TODAY_MESSAGE,
    findSightingBlockers,
    isFormationNotInToday,
    SIGHTING_BLOCK_MESSAGES,
    SightingBlockReason,
    toSightingTimeIso,
} from './sighting-precheck.util';

/** 編成番号の候補の最大件数（スマホで長くなりすぎないように） */
const MAX_FORMATION_CANDIDATES = 20;

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
        MatButtonModule,
        MatAutocompleteModule,
        RouterLink,
        TrainPickerComponent,
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
    readonly #router = inject(Router);
    readonly #ga = inject(GoogleAnalyticsService);
    readonly #operationPostCardService = inject(OperationPostCardService);
    readonly #injector = inject(Injector);
    readonly #listsRefresher = inject(TodaysListsRefresher);
    readonly #todaysOperations = inject(TodaysOperationListState)
        .todaysOperations;
    readonly #agencyList = inject(AgencyListState).agencies;
    readonly #todaysFormationsSorted = inject(TodaysFormationListState)
        .todaysFormationsSorted;
    /** viewChild は ES private (#) にできないので private を使う */
    private readonly formationInput =
        viewChild<ElementRef<HTMLInputElement>>('formationInput');

    readonly #userState = inject(UserState);
    readonly isLoggedIn = this.#userState.isLoggedIn;
    /** viewer は投稿できない（api が 403 で断る）ので、フォームの代わりに案内を出す */
    readonly isViewer = this.#userState.isViewer;
    /** 目撃の投稿を登録者だけにするか（フィーチャーフラグ。off の間はゲストにもフォームを出す） */
    readonly registeredOnly = inject(FeatureFlagState).registeredOnlyPosting;
    /** フラグが on のときだけ、ゲストには入力欄の代わりにログインの案内を出す */
    readonly showGuestPrompt = computed(
        () => this.registeredOnly() && !this.isLoggedIn(),
    );

    /** 今の画面に戻ってくる先。router.url は signal ではないので、描き直しのたびに読む */
    returnTo(): string {
        return safeReturnTo(this.#router.url);
    }

    /** 初めに入れておく値（リアルタイムの行から開いたとき）。2026-10-22 */
    readonly initialValue = input<OperationPostInitialValue>({});
    /** どこから開いたか（GA の source）。トップのカードは自分自身が入口 */
    readonly source = input<OperationPostSource>('top_card');
    /** フォームの代わりに「列車を選ぶ」画面を出すか。FormGroup はこの部品に残るので入力途中の値は消えない */
    readonly mode = signal<'form' | 'picker'>('form');
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

    readonly #agencies = inject(OperationPostCardStore).agencies;
    readonly #todaysFormations = inject(TodaysFormationListState)
        .todaysFormations;
    /** 所属は今日の編成を持つ会社だけ（相鉄・JR東日本・東急。2026-10-06） */
    readonly agencies = computed(() =>
        filterAgenciesWithFormations(
            this.#agencies(),
            this.#todaysFormations(),
        ),
    );

    /** valueChanges を流さない patchValue（初期値）も拾うため、フォームの値は手で同期する */
    readonly #formValue = signal(this.sightingForm.getRawValue());
    /** 列車から選んだ運用番号。値が変わったら「選んだ」扱いを外す */
    #pickedOperationNumber: string | null = null;
    #operationFromTrain = false;
    /** 一覧を引き直している間（submitting の前）も 2 回送らせない */
    #refreshingLists = false;

    /** 打った字で始まる今日の編成（所属を選んでいればその会社だけ）。推測の充当編成は混ぜない */
    readonly formationCandidates = computed<FormationDetailsDto[]>(() => {
        const { agencyId, formationOrVehicleNumber } = this.#formValue();
        const typed = formationOrVehicleNumber.trim();
        if (typed === '') return [];
        return this.#todaysFormationsSorted()
            .filter(
                (f) =>
                    (agencyId === '' || f.agencyId === agencyId) &&
                    (f.formationNumber ?? '').startsWith(typed),
            )
            .slice(0, MAX_FORMATION_CANDIDATES);
    });
    /** 今日の編成に無い番号。止めずに注意だけ出す（車両番号かもしれないため） */
    readonly formationNotInToday = computed(() => {
        const { agencyId, formationOrVehicleNumber } = this.#formValue();
        return isFormationNotInToday({
            agencyId,
            formationOrVehicleNumber,
            todaysFormations: this.#todaysFormationsSorted(),
        });
    });
    readonly formationNotInTodayMessage = FORMATION_NOT_IN_TODAY_MESSAGE;
    readonly blockMessages = SIGHTING_BLOCK_MESSAGES;

    /** 候補の option の副表示（形式・会社） */
    formationAnnotation(formation: FormationDetailsDto): string {
        return formatFormationAnnotation(formation, this.#agencyList());
    }

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
            untracked(() => {
                this.sightingForm.patchValue(initial, { emitEvent: false });
                this.#formValue.set(this.sightingForm.getRawValue());
            });
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

    /** 編成の候補を押したとき、所属が空ならその編成の会社を入れる（押した候補の会社を入れるだけで推測はしない） */
    onFormationCandidateSelected(formation: FormationDetailsDto): void {
        const agencyId = this.sightingForm.controls.agencyId;
        if (agencyId.value === '') {
            agencyId.setValue(formation.agencyId);
        }
    }

    /** 送る前の確認で止めた理由の文言。止めていなければ空 */
    precheckMessage(controlName: 'operationNumber' | 'sightingTime'): string {
        const reason = this.sightingForm
            .get(controlName)
            .getError('precheck') as SightingBlockReason | null;
        return reason ? this.blockMessages[reason] : '';
    }

    openPicker(): void {
        this.mode.set('picker');
        this.#ga.sendEvent('train_picker_open', { source: this.source() });
    }

    closePicker(): void {
        this.mode.set('form');
    }

    onTrainPicked(train: PickableTrain): void {
        this.#pickedOperationNumber = train.operationNumber;
        // patchValue が最初の valueChanges なら sighting_form_start が飛ぶので、先に印を付ける
        this.#operationFromTrain = true;
        this.sightingForm.patchValue({
            operationNumber: train.operationNumber,
        });
        this.mode.set('form');
        this.#ga.sendEvent('train_picker_select', { source: this.source() });
        // 編成番号は車体を見て打つので、続けて打てるよう欄にフォーカスする。
        // フォームの描き直しを待ってから（picker の間は欄が DOM に無い）
        afterNextRender(() => this.formationInput()?.nativeElement.focus(), {
            injector: this.#injector,
        });
    }

    hookEvent(): void {
        this.sightingForm.valueChanges
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => {
                this.#formValue.set(this.sightingForm.getRawValue());
            });

        // 選んだ番号と違う値に打ち直したら、列車から選んだとは数えない
        this.sightingForm
            .get('operationNumber')
            .valueChanges.pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((value) => {
                if (value !== this.#pickedOperationNumber) {
                    this.#operationFromTrain = false;
                }
            });

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
                this.#ga.sendEvent('sighting_form_start', this.#gaParams());
            });
    }

    async submit(formGroupDirective: FormGroupDirective): Promise<void> {
        // 応答待ちのあいだに Enter で 2 回送らない
        if (this.submitting() || this.#refreshingLists) return;
        // 4 時をまたいで開いたままなら、前の営業日の一覧で止めないよう引き直す。
        // 引き直せなければ運用番号の確かめは飛ばして api に任せる
        this.#refreshingLists = true;
        let listsAreFresh: boolean;
        try {
            listsAreFresh = await this.#listsRefresher.refreshIfStale();
        } finally {
            this.#refreshingLists = false;
        }
        const { agencyId, timeSetting, sightingTime } = this.sightingForm.value;
        // 前後の空白は候補・注意・確認・api で食い違うので、ここで落としてから使う
        const formationOrVehicleNumber =
            this.sightingForm.value.formationOrVehicleNumber.trim();
        const operationNumber = this.sightingForm.value.operationNumber.trim();

        const now = new Date();

        const convertedSightingTime = toSightingTimeIso({
            timeSetting,
            sightingTime,
            now,
        });

        const blockers = findSightingBlockers({
            operationNumber,
            sightingTimeIso: convertedSightingTime,
            now,
            // 100 は一覧に無いが、findSightingBlockers が通す。空なら運用番号は確かめない
            todaysOperationNumbers: listsAreFresh
                ? this.#todaysOperations().map((o) => o.operationNumber)
                : [],
        });
        if (blockers.length > 0) {
            this.#block(blockers);
            return;
        }

        this.#ga.sendEvent('sighting_submit', this.#gaParams());

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
                ...this.#gaParams(),
                // GA のイベントの値は 100 文字まで
                error_message: result.error.message.slice(0, 100),
            });
            this.#error.handleError(result.error);
            this.#snackBar.open(
                result.error.statusCode === 403
                    ? '投稿する権限がありません'
                    : result.error.message,
                'OK',
                { duration: 3000 },
            );
            return;
        }

        if (result.isSuccess()) {
            this.#ga.sendEvent('sighting_submit_success', this.#gaParams());
            this.#snackBar.open('目撃情報を投稿しました', 'OK', {
                duration: 3000,
            });

            this.#pickedOperationNumber = null;
            this.#operationFromTrain = false;
            formGroupDirective.resetForm({
                agencyId: '',
                formationOrVehicleNumber: '',
                operationNumber: '',
                timeSetting: 'currentTime',
                sightingTime: '',
            });

            this.#operationPostCardService.emitSubmitEvent();
            this.submitted.emit();
        }
    }

    /** どの欄に出すか: 未来の時刻は目撃時刻、運用番号は運用番号の欄 */
    #block(reasons: SightingBlockReason[]): void {
        for (const reason of reasons) {
            const control = this.sightingForm.get(
                reason === 'future_time' ? 'sightingTime' : 'operationNumber',
            );
            control.setErrors({ precheck: reason });
            control.markAsTouched();
        }
        this.#ga.sendEvent('sighting_submit_blocked', {
            source: this.source(),
            reason: reasons[0],
        });
    }

    #gaParams(): {
        source: OperationPostSource;
        time_setting: 'current' | 'specified';
        operation_from_train: 0 | 1;
    } {
        return {
            source: this.source(),
            time_setting:
                this.sightingForm.getRawValue().timeSetting === 'specifiedTime'
                    ? 'specified'
                    : 'current',
            operation_from_train: this.#operationFromTrain ? 1 : 0,
        };
    }

    #setSubmitting(value: boolean): void {
        this.submitting.set(value);
        this.submittingChange.emit(value);
    }
}
