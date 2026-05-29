import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { addDays, getHours, parse, subDays } from 'date-fns';
import { lastValueFrom } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { tryCatchAsync } from 'src/app/core/utils/error-handling';
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

@Component({
    selector: 'app-new-operation-post-card',
    templateUrl: './new-operation-post-card.component.html',
    styleUrl: './new-operation-post-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatSelectModule,
        MatButtonModule,
        MatSnackBarModule,
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

    constructor() {
        this.fetchData();
        this.hookEvent();
    }

    async fetchData(): Promise<void> {
        await lastValueFrom(
            this.#newOperationPostCardService.fetchServiceAgencies(),
        );
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

            this.#socket.emit('sendSighting', result);

            this.#newOperationPostCardService.emitSubmitEvent();
        }
    }
}
