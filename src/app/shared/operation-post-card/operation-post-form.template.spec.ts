import '@testing-library/jest-dom';
import { Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { of, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TodaysListsRefresher } from 'src/app/global-states/todays-lists-refresher';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { LoadingService } from '../loading/loading.service';
import { PickableTrain } from '../train-picker/pickable-train.interface';
import { TrainPickerComponent } from '../train-picker/train-picker.component';
import { OperationPostCardService } from './operation-post-card.service';
import { OperationPostCardStore } from './operation-post-card.store';
import { OperationPostFormComponent } from './operation-post-form.component';

/** 列車を選ぶ画面の代わり（フォームとの入れ替えだけを見る） */
@Component({ selector: 'app-train-picker', template: 'picker' })
class StubTrainPickerComponent {
    readonly picked = output<PickableTrain>();
    readonly cancelled = output<void>();
}

/** 運用番号の欄（mat-form-field） */
const operationNumberField = (form: HTMLElement): HTMLElement =>
    form
        .querySelector('input[formcontrolname="operationNumber"]')!
        .closest('mat-form-field') as HTMLElement;

describe('OperationPostFormComponent（テンプレート）', () => {
    let fixture: ComponentFixture<OperationPostFormComponent>;
    let component: OperationPostFormComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPostFormComponent, NoopAnimationsModule],
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: {
                        getItem: jest.fn().mockResolvedValue(null),
                        setItem: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: OperationPostCardService,
                    useValue: {
                        fetchServiceAgencies: () => of(undefined),
                        postOperationSighting: jest.fn(() => of(undefined)),
                        emitSubmitEvent: jest.fn(),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: { open: jest.fn(), close: jest.fn() },
                },
                { provide: ErrorHandlerService, useValue: {} },
                { provide: SocketService, useValue: { emit: jest.fn() } },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
                provideRouter([]),
            ],
        })
            .overrideComponent(OperationPostFormComponent, {
                remove: { imports: [TrainPickerComponent] },
                add: { imports: [StubTrainPickerComponent] },
            })
            .overrideProvider(MatSnackBar, { useValue: { open: jest.fn() } })
            .compileComponents();

        patchState(unprotected(TestBed.inject(UserState)), { userId: 'u1' });
        fixture = TestBed.createComponent(OperationPostFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('列車から選ぶを押すと列車を選ぶ画面に替わり、列車を選ぶとフォームに戻って編成番号の欄にフォーカスが移る', async () => {
        const form: HTMLElement = fixture.nativeElement;
        const openButton = Array.from(form.querySelectorAll('button')).find(
            (b) => b.textContent?.includes('列車から選ぶ'),
        );
        openButton?.click();
        fixture.detectChanges();

        expect(form.querySelector('form')).toBeNull();
        expect(form.querySelector('app-train-picker')).not.toBeNull();

        component.onTrainPicked({ operationNumber: '31' } as PickableTrain);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(form.querySelector('form')).not.toBeNull();
        expect(form.querySelector('app-train-picker')).toBeNull();
        expect(
            form.querySelector(
                'input[formcontrolname="formationOrVehicleNumber"]',
            ),
        ).toHaveFocus();
        expect(
            form.querySelector<HTMLInputElement>(
                'input[formcontrolname="operationNumber"]',
            )?.value,
        ).toBe('31');
    });

    it('運用番号が一覧に無くて止めたとき、運用番号の欄に文言が出る', async () => {
        patchState(
            unprotected(TestBed.inject(TodaysOperationListState)),
            setAllEntities(
                [
                    { operationId: 'op1', operationNumber: '1' },
                ] as unknown as OperationDetailsDto[],
                { selectId: (o: OperationDetailsDto) => o.operationId },
            ),
        );
        component.sightingForm.patchValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10701',
            operationNumber: '99',
        });
        TestBed.inject(OperationPostCardStore).setNoGuessAgreed(true);
        fixture.detectChanges();

        await component.submit({
            resetForm: jest.fn(),
        } as unknown as Parameters<typeof component.submit>[0]);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('mat-error'),
        ).toHaveTextContent('指定された運用番号の運用情報が見つかりません');
    });

    it('エラーが無いとき、説明が出て、欄の下に「列車から選ぶ」のボタンがある', () => {
        const form: HTMLElement = fixture.nativeElement;
        expect(
            operationNumberField(form).querySelector('mat-hint'),
        ).toHaveTextContent('休車の場合は「100」を入力');
        const button = [...form.querySelectorAll('button')].find((b) =>
            b.textContent?.includes('列車から選ぶ'),
        );
        expect(button).toBeDefined();
        expect(button).toHaveAttribute('mat-stroked-button');
    });

    it('送る前の確認で止めたとき、説明の代わりにエラーが出てボタンは残る', async () => {
        patchState(
            unprotected(TestBed.inject(TodaysOperationListState)),
            setAllEntities(
                [
                    { operationId: 'op1', operationNumber: '1' },
                ] as unknown as OperationDetailsDto[],
                { selectId: (o: OperationDetailsDto) => o.operationId },
            ),
        );
        component.sightingForm.patchValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10701',
            operationNumber: '99',
        });
        TestBed.inject(OperationPostCardStore).setNoGuessAgreed(true);
        fixture.detectChanges();
        await component.submit({
            resetForm: jest.fn(),
        } as unknown as Parameters<typeof component.submit>[0]);
        fixture.detectChanges();

        const form: HTMLElement = fixture.nativeElement;
        expect(operationNumberField(form).querySelector('mat-hint')).toBeNull();
        expect(form.querySelector('mat-error')).not.toBeNull();
        expect(form).toHaveTextContent('列車から選ぶ');
    });

    describe('押せないときの知らせ', () => {
        const submitButton = (): HTMLButtonElement =>
            fixture.nativeElement.querySelector(
                'app-button[type="submit"] button, button[type="submit"]',
            );
        const post = (): jest.Mock =>
            TestBed.inject(OperationPostCardService)
                .postOperationSighting as unknown as jest.Mock;
        const fillValid = (): void => {
            patchState(
                unprotected(TestBed.inject(TodaysOperationListState)),
                setAllEntities(
                    [
                        { operationId: 'op1', operationNumber: '1' },
                    ] as unknown as OperationDetailsDto[],
                    { selectId: (o: OperationDetailsDto) => o.operationId },
                ),
            );
            component.sightingForm.patchValue({
                agencyId: 'sotetsu',
                formationOrVehicleNumber: '10701',
                operationNumber: '1',
            });
            TestBed.inject(OperationPostCardStore).setNoGuessAgreed(true);
            fixture.detectChanges();
        };

        it('送るボタンは disabled 属性を持たず、押せないときだけ aria-disabled が付く', () => {
            // 入力が足りない
            expect(submitButton()).toBeEnabled();
            expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

            fillValid();
            expect(submitButton()).toBeEnabled();
            expect(submitButton()).not.toHaveAttribute('aria-disabled');
        });

        it('一覧を引き直している間は、送るボタンが押せない印になり、押しても何も始めない', async () => {
            fillValid();
            const refresh = jest.spyOn(
                TestBed.inject(TodaysListsRefresher),
                'refreshIfStale',
            );

            component.refreshingLists.set(true);
            fixture.detectChanges();
            expect(submitButton()).toBeEnabled();
            expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

            submitButton().click();
            await fixture.whenStable();

            expect(refresh).not.toHaveBeenCalled();
            expect(post()).not.toHaveBeenCalled();
        });

        it('送っている間は、押しても Enter（form の submit）でも何も始めない', async () => {
            fillValid();
            const refresh = jest.spyOn(
                TestBed.inject(TodaysListsRefresher),
                'refreshIfStale',
            );
            component.submitting.set(true);
            fixture.detectChanges();

            submitButton().click();
            fixture.nativeElement
                .querySelector('form')
                .dispatchEvent(new Event('submit'));
            await fixture.whenStable();

            expect(refresh).not.toHaveBeenCalled();
            expect(post()).not.toHaveBeenCalled();
        });

        it('入力が足りないまま押すと、全部の欄が触れた扱いになり、最初の足りない欄にフォーカスが移る', async () => {
            submitButton().click();
            await fixture.whenStable();
            fixture.detectChanges();

            const form: HTMLElement = fixture.nativeElement;
            expect(post()).not.toHaveBeenCalled();
            expect(
                form.querySelector('mat-select[formcontrolname="agencyId"]'),
            ).toHaveFocus();
            expect(form.querySelectorAll('mat-error').length).toBe(4);
        });

        it('所属だけ入っていれば、次の足りない欄（編成番号）にフォーカスが移る', async () => {
            component.sightingForm.patchValue({ agencyId: 'sotetsu' });
            fixture.detectChanges();

            submitButton().click();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(
                fixture.nativeElement.querySelector(
                    'input[formcontrolname="formationOrVehicleNumber"]',
                ),
            ).toHaveFocus();
        });

        it('失敗したとき、snackbar と同じ文が role="alert" の見えない領域に入り、次に送るときに空になる', async () => {
            fillValid();
            const errorHandler = TestBed.inject(
                ErrorHandlerService,
            ) as unknown as { handleError: jest.Mock };
            errorHandler.handleError = jest.fn();
            post().mockReturnValueOnce(
                throwError(() => new FetchError(500, '編成が見つかりません')),
            );
            const region = (): HTMLElement =>
                fixture.nativeElement.querySelector('[role="alert"]');
            expect(region()).toHaveTextContent('');
            expect(region()).toHaveClass('tw-sr-only');

            const directive = { resetForm: jest.fn() } as unknown as Parameters<
                typeof component.submit
            >[0];
            await component.submit(directive);
            fixture.detectChanges();

            expect(region()).toHaveTextContent('編成が見つかりません');
            expect(TestBed.inject(MatSnackBar).open).toHaveBeenCalledWith(
                '編成が見つかりません',
                'OK',
                { duration: 3000 },
            );

            post().mockReturnValueOnce(new Promise(() => undefined));
            void component.submit(directive);
            await new Promise((r) => setTimeout(r));
            fixture.detectChanges();
            expect(region()).toHaveTextContent('');
        });
    });

    describe('推測の投稿の禁止', () => {
        const checkbox = (): HTMLElement =>
            fixture.nativeElement.querySelector(
                'mat-checkbox[formcontrolname="noGuessAgreed"]',
            );
        const checkboxInput = (): HTMLInputElement =>
            checkbox().querySelector('input')!;
        const submitButton = (): HTMLButtonElement =>
            fixture.nativeElement.querySelector(
                'app-button[type="submit"] button',
            );
        const store = (): InstanceType<typeof OperationPostCardStore> =>
            TestBed.inject(OperationPostCardStore);
        const post = (): jest.Mock =>
            TestBed.inject(OperationPostCardService)
                .postOperationSighting as unknown as jest.Mock;
        const fillOthers = (): void => {
            patchState(
                unprotected(TestBed.inject(TodaysOperationListState)),
                setAllEntities(
                    [
                        { operationId: 'op1', operationNumber: '1' },
                    ] as unknown as OperationDetailsDto[],
                    { selectId: (o: OperationDetailsDto) => o.operationId },
                ),
            );
            component.sightingForm.patchValue({
                agencyId: 'sotetsu',
                formationOrVehicleNumber: '10701',
                operationNumber: '1',
            });
            fixture.detectChanges();
        };

        it('警告の文とチェックの文が出て、警告にはアイコンが付く', () => {
            const form: HTMLElement = fixture.nativeElement;
            expect(form).toHaveTextContent(
                '実際に目撃した編成のみを投稿してください。順送りなどから推測した編成の投稿は禁止しています。繰り返される場合は、投稿権限を剥奪することがあります。',
            );
            expect(form).toHaveTextContent('error_outline');
            expect(checkbox()).toHaveTextContent(
                '目撃した編成のみを投稿します',
            );
        });

        it('チェックが無いと、ほかが揃っていても「投稿する」に aria-disabled が付く', () => {
            fillOthers();
            expect(submitButton()).toHaveAttribute('aria-disabled', 'true');

            checkboxInput().click();
            fixture.detectChanges();
            expect(submitButton()).not.toHaveAttribute('aria-disabled');
        });

        it('チェックが無いまま押すと送らず、「チェックを入れてください」が出てチェックにフォーカスが移る', async () => {
            fillOthers();
            submitButton().click();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(post()).not.toHaveBeenCalled();
            expect(checkbox().parentElement).toHaveTextContent(
                'チェックを入れてください',
            );
            expect(checkboxInput()).toHaveFocus();
        });

        it('チェックを入れると store に書き、外すと外れる', () => {
            checkboxInput().click();
            fixture.detectChanges();
            expect(store().noGuessAgreed()).toBe(true);

            checkboxInput().click();
            fixture.detectChanges();
            expect(store().noGuessAgreed()).toBe(false);
        });

        it('store が true なら、フォームを開いたときチェックが入っている', () => {
            store().setNoGuessAgreed(true);
            const opened = TestBed.createComponent(OperationPostFormComponent);
            opened.detectChanges();

            expect(
                opened.nativeElement.querySelector(
                    'mat-checkbox[formcontrolname="noGuessAgreed"] input',
                ),
            ).toBeChecked();
        });

        it('store の値が後から true に戻ると、チェックが入る', () => {
            expect(checkboxInput()).not.toBeChecked();
            store().setNoGuessAgreed(true);
            fixture.detectChanges();
            expect(checkboxInput()).toBeChecked();
        });

        it('投稿に成功したあとも、チェックは入ったまま', async () => {
            store().setNoGuessAgreed(true);
            fixture.detectChanges();
            fillOthers();
            fixture.nativeElement
                .querySelector('form')
                .dispatchEvent(new Event('submit'));
            await fixture.whenStable();
            fixture.detectChanges();

            expect(post()).toHaveBeenCalled();
            expect(checkboxInput()).toBeChecked();
            expect(store().noGuessAgreed()).toBe(true);
        });
    });
});
