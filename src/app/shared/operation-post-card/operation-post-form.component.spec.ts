import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroupDirective } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { of, Subject, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { FeatureFlagState } from 'src/app/global-states/feature-flag.state';
import { TodaysCalendarListState } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { PickableTrain } from '../train-picker/pickable-train.interface';
import { LoadingService } from '../loading/loading.service';
import { OperationPostCardService } from './operation-post-card.service';
import { OperationPostFormComponent } from './operation-post-form.component';

describe('OperationPostFormComponent', () => {
    let component: OperationPostFormComponent;
    let fixture: ComponentFixture<OperationPostFormComponent>;
    let formGroupDirective: FormGroupDirective;
    let postOperationSighting: jest.Mock;
    let emitSubmitEvent: jest.Mock;
    let snackBarOpen: jest.Mock;
    let socketEmit: jest.Mock;
    let handleError: jest.Mock;
    let resetForm: jest.Mock;
    let sendEvent: jest.Mock;
    let findCalendar: jest.Mock;
    let findOperations: jest.Mock;
    let findFormations: jest.Mock;

    beforeEach(async () => {
        postOperationSighting = jest.fn(() => of(undefined));
        emitSubmitEvent = jest.fn();
        snackBarOpen = jest.fn();
        socketEmit = jest.fn();
        handleError = jest.fn();
        resetForm = jest.fn();
        sendEvent = jest.fn();
        findCalendar = jest.fn(() => of({ calendarId: 'holiday' }));
        findOperations = jest.fn(() => of([]));
        findFormations = jest.fn(() => of([]));
        formGroupDirective = {
            resetForm,
        } as unknown as FormGroupDirective;

        await TestBed.configureTestingModule({
            imports: [OperationPostFormComponent],
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
                        postOperationSighting,
                        emitSubmitEvent,
                    },
                },
                {
                    provide: LoadingService,
                    useValue: { open: jest.fn(), close: jest.fn() },
                },
                { provide: ErrorHandlerService, useValue: { handleError } },
                { provide: SocketService, useValue: { emit: socketEmit } },
                { provide: GoogleAnalyticsService, useValue: { sendEvent } },
                {
                    provide: CalendarService,
                    useValue: { findOneBySpecificDate: findCalendar },
                },
                {
                    provide: OperationService,
                    useValue: { findManyByCalendarId: findOperations },
                },
                {
                    provide: FormationService,
                    useValue: { findManyBySpecificDate: findFormations },
                },
                provideRouter([]),
            ],
        })
            .overrideComponent(OperationPostFormComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        patchState(unprotected(TestBed.inject(UserState)), { userId: 'u1' });
        fixture = TestBed.createComponent(OperationPostFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const fill = (sightingTime?: string) => {
        component.sightingForm.patchValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10701',
            operationNumber: '12',
        });
        if (sightingTime) {
            component.onTimeSettingChange('specifiedTime');
            component.sightingForm.patchValue({ sightingTime });
        }
    };

    const submit = () => component.submit(formGroupDirective);

    const postedTime = () =>
        new Date(postOperationSighting.mock.calls[0][0].sightingTime);

    const gaParams = {
        source: 'top_card',
        time_setting: 'current',
        operation_from_train: 0,
    };

    const eventNames = () => sendEvent.mock.calls.map(([name]) => name);

    it('initialValue の運用番号を入れた状態で始まる', () => {
        fixture.componentRef.setInput('initialValue', {
            operationNumber: '11',
        });
        fixture.detectChanges();
        expect(component.sightingForm.getRawValue().operationNumber).toBe('11');
    });

    it('initialValue の所属と編成番号を入れた状態で始まる', () => {
        fixture.componentRef.setInput('initialValue', {
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
        });
        fixture.detectChanges();
        const value = component.sightingForm.getRawValue();
        expect(value.agencyId).toBe('sotetsu');
        expect(value.formationOrVehicleNumber).toBe('10706');
        expect(value.operationNumber).toBe('');
    });

    it('投稿に成功したら submitted を流す', async () => {
        postOperationSighting.mockReturnValue(of(undefined));
        const submitted = jest.fn();
        component.submitted.subscribe(submitted);
        component.sightingForm.setValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
            operationNumber: '11',
            timeSetting: 'currentTime',
            sightingTime: '',
        });
        await submit();
        expect(submitted).toHaveBeenCalledTimes(1);
    });

    it('投稿に失敗したら submitted を流さず、入力を残す', async () => {
        postOperationSighting.mockReturnValue(
            throwError(() => new FetchError(500, '失敗しました')),
        );
        const submitted = jest.fn();
        component.submitted.subscribe(submitted);
        component.sightingForm.setValue({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10706',
            operationNumber: '11',
            timeSetting: 'currentTime',
            sightingTime: '',
        });
        await submit();
        expect(submitted).not.toHaveBeenCalled();
        expect(component.sightingForm.getRawValue().operationNumber).toBe('11');
    });

    it('時刻指定にしたときだけ目撃時刻を入力できる', () => {
        const sightingTime = component.sightingForm.controls.sightingTime;
        expect(sightingTime.disabled).toBe(true);

        component.onTimeSettingChange('specifiedTime');
        expect(sightingTime.enabled).toBe(true);

        component.onTimeSettingChange('currentTime');
        expect(sightingTime.disabled).toBe(true);
    });

    it('現在時刻で投稿し、成功したらフォームを空に戻して他の画面に知らせる', async () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
        fill();

        await submit();

        expect(postOperationSighting).toHaveBeenCalledWith({
            agencyId: 'sotetsu',
            formationOrVehicleNumber: '10701',
            operationNumber: '12',
            sightingTime: new Date(2026, 9, 8, 10, 0).toISOString(),
        });
        expect(snackBarOpen).toHaveBeenCalledWith(
            '目撃情報を投稿しました',
            'OK',
            { duration: 3000 },
        );
        expect(resetForm).toHaveBeenCalledWith(
            expect.objectContaining({ timeSetting: 'currentTime' }),
        );
        expect(emitSubmitEvent).toHaveBeenCalled();
    });

    it('昼間に 4 時より前の時刻を指定したら、翌日の時刻になって未来なので送らない', async () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 8, 23, 0) });
        fill('01:30');

        await submit();

        expect(postOperationSighting).not.toHaveBeenCalled();
        expect(
            component.sightingForm.controls.sightingTime.getError('precheck'),
        ).toBe('future_time');
    });

    it('4 時より前に、4 時以降の時刻を指定したら、前日のその時刻にする', async () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 9, 1, 0) });
        fill('23:50');

        await submit();

        expect(postedTime()).toEqual(new Date(2026, 9, 8, 23, 50));
    });

    it('その日のうちの時刻はその日のまま', async () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
        fill('09:15');

        await submit();

        expect(postedTime()).toEqual(new Date(2026, 9, 8, 9, 15));
    });

    it('失敗したらその理由を出し、フォームは残す', async () => {
        const error = new FetchError(400, '編成が見つかりません');
        postOperationSighting.mockReturnValue(throwError(() => error));
        fill();

        await submit();

        expect(handleError).toHaveBeenCalledWith(error);
        expect(snackBarOpen).toHaveBeenCalledWith(
            '編成が見つかりません',
            'OK',
            { duration: 3000 },
        );
        expect(resetForm).not.toHaveBeenCalled();
        expect(emitSubmitEvent).not.toHaveBeenCalled();
    });

    it('初めの値を入れただけでは sighting_form_start を送らない', () => {
        fixture.componentRef.setInput('initialValue', {
            operationNumber: '11',
        });
        fixture.detectChanges();
        expect(eventNames()).toEqual([]);

        component.sightingForm.patchValue({ agencyId: 'sotetsu' });
        expect(eventNames()).toEqual(['sighting_form_start']);
    });

    it('応答を待っている間にもう一度送っても、1 回しか送らない', async () => {
        const response = new Subject<void>();
        postOperationSighting.mockReturnValue(response);
        fill();

        const first = submit();
        await submit();
        response.next();
        response.complete();
        await first;

        expect(postOperationSighting).toHaveBeenCalledTimes(1);
    });

    it('送っている間だけ submittingChange で true を流し、終わったら false に戻す', async () => {
        const changes: boolean[] = [];
        component.submittingChange.subscribe((v) => changes.push(v));
        fill();

        await submit();

        expect(changes).toEqual([true, false]);
        expect(component.submitting()).toBe(false);
    });

    it('フォームに最初に触ったときだけ sighting_form_start を送る', () => {
        expect(eventNames()).toEqual([]);

        component.sightingForm.patchValue({ agencyId: 'sotetsu' });
        component.sightingForm.patchValue({ operationNumber: '12' });

        expect(eventNames()).toEqual(['sighting_form_start']);
    });

    it('投稿に成功したら sighting_submit と sighting_submit_success を送る', async () => {
        fill();
        sendEvent.mockClear();

        await submit();

        expect(eventNames()).toEqual([
            'sighting_submit',
            'sighting_submit_success',
        ]);
    });

    it('投稿に失敗したら sighting_submit_failure を理由つきで送る', async () => {
        postOperationSighting.mockReturnValue(
            throwError(() => new FetchError(400, '編成が見つかりません')),
        );
        fill();
        sendEvent.mockClear();

        await submit();

        expect(sendEvent.mock.calls).toEqual([
            ['sighting_submit', gaParams],
            [
                'sighting_submit_failure',
                { ...gaParams, error_message: '編成が見つかりません' },
            ],
        ]);
    });

    it('失敗の理由は 100 文字までに切って送る', async () => {
        postOperationSighting.mockReturnValue(
            throwError(() => new FetchError(500, 'あ'.repeat(150))),
        );
        fill();

        await submit();

        expect(sendEvent).toHaveBeenLastCalledWith('sighting_submit_failure', {
            ...gaParams,
            error_message: 'あ'.repeat(100),
        });
    });

    it('投稿に成功しても socket に送らない', async () => {
        fill();

        await submit();

        expect(emitSubmitEvent).toHaveBeenCalled();
        expect(socketEmit).not.toHaveBeenCalled();
    });

    it('403 なら「投稿する権限がありません」と出す', async () => {
        postOperationSighting.mockReturnValue(
            throwError(() => new FetchError(403, 'Forbidden resource')),
        );
        fill();

        await submit();

        expect(snackBarOpen).toHaveBeenCalledWith(
            '投稿する権限がありません',
            'OK',
            { duration: 3000 },
        );
        expect(resetForm).not.toHaveBeenCalled();
    });

    describe('M30 列車から選ぶ・候補・送る前の確認', () => {
        const setOperations = (numbers: string[]): void => {
            patchState(
                unprotected(TestBed.inject(TodaysOperationListState)),
                setAllEntities(
                    numbers.map(
                        (n) =>
                            ({
                                operationId: `op${n}`,
                                operationNumber: n,
                            }) as unknown as OperationDetailsDto,
                    ),
                    {
                        selectId: (o: OperationDetailsDto) => o.operationId,
                    },
                ),
            );
        };
        const setFormations = (
            list: { agencyId: string; formationNumber: string }[],
        ): void => {
            patchState(
                unprotected(TestBed.inject(TodaysFormationListState)),
                setAllEntities(
                    list.map(
                        (f) =>
                            ({
                                formationId: `${f.agencyId}-${f.formationNumber}`,
                                ...f,
                            }) as unknown as FormationDetailsDto,
                    ),
                    {
                        selectId: (f: FormationDetailsDto) => f.formationId,
                    },
                ),
            );
        };
        const train = { operationNumber: '31' } as PickableTrain;

        it('onTrainPicked で運用番号が入り mode が form に戻る', () => {
            component.openPicker();
            expect(component.mode()).toBe('picker');
            expect(sendEvent).toHaveBeenCalledWith('train_picker_open', {
                source: 'top_card',
            });

            component.onTrainPicked(train);

            expect(component.sightingForm.getRawValue().operationNumber).toBe(
                '31',
            );
            expect(component.mode()).toBe('form');
            expect(sendEvent).toHaveBeenCalledWith('train_picker_select', {
                source: 'top_card',
            });
        });

        it('列車から選んで送ると operation_from_train=1、source が載る', async () => {
            fixture.componentRef.setInput('source', 'train_diagram');
            fill();
            component.onTrainPicked(train);
            sendEvent.mockClear();

            await submit();

            expect(sendEvent).toHaveBeenCalledWith('sighting_submit', {
                source: 'train_diagram',
                time_setting: 'current',
                operation_from_train: 1,
            });
            expect(sendEvent).toHaveBeenCalledWith('sighting_submit_success', {
                source: 'train_diagram',
                time_setting: 'current',
                operation_from_train: 1,
            });
        });

        it('列車から選んだ後に運用番号を打ち直すと operation_from_train=0', async () => {
            fill();
            component.onTrainPicked(train);
            component.sightingForm.patchValue({ operationNumber: '32' });
            sendEvent.mockClear();

            await submit();

            expect(sendEvent).toHaveBeenCalledWith(
                'sighting_submit',
                expect.objectContaining({ operation_from_train: 0 }),
            );
        });

        it('編成番号と運用番号の前後の空白を落としてから確かめ、送る', async () => {
            setOperations(['12']);
            component.sightingForm.patchValue({
                agencyId: 'sotetsu',
                formationOrVehicleNumber: ' 10701 ',
                operationNumber: ' 12 ',
            });

            await submit();

            expect(postOperationSighting).toHaveBeenCalledWith(
                expect.objectContaining({
                    formationOrVehicleNumber: '10701',
                    operationNumber: '12',
                }),
            );
        });

        it('編成の候補を押したとき、所属が空ならその編成の所属が入り、入っていれば変えない', () => {
            const formation = {
                agencyId: 'tokyu',
                formationNumber: '5050',
            } as FormationDetailsDto;

            component.onFormationCandidateSelected(formation);
            expect(component.sightingForm.getRawValue().agencyId).toBe('tokyu');

            component.sightingForm.patchValue({ agencyId: 'sotetsu' });
            component.onFormationCandidateSelected(formation);
            expect(component.sightingForm.getRawValue().agencyId).toBe(
                'sotetsu',
            );
        });

        it('時刻指定で送ると GA の time_setting は specified', async () => {
            jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
            fill('09:00');
            sendEvent.mockClear();

            await submit();

            expect(sendEvent).toHaveBeenCalledWith('sighting_submit', {
                source: 'top_card',
                time_setting: 'specified',
                operation_from_train: 0,
            });
        });

        it('列車から選んで送り終えた後は、同じ番号を打ち直しても operation_from_train=0', async () => {
            fill();
            component.onTrainPicked(train);
            await submit();
            component.sightingForm.patchValue({ operationNumber: '31' });
            sendEvent.mockClear();

            await submit();

            expect(sendEvent).toHaveBeenCalledWith(
                'sighting_submit',
                expect.objectContaining({ operation_from_train: 0 }),
            );
        });

        it('最初の操作が列車から選ぶでも、sighting_form_start は operation_from_train=1', () => {
            component.onTrainPicked(train);

            expect(sendEvent).toHaveBeenCalledWith('sighting_form_start', {
                source: 'top_card',
                time_setting: 'current',
                operation_from_train: 1,
            });
        });

        it('未来の時刻と運用番号の両方が当たると、両方の欄に出し、blocked の reason は未来の時刻', async () => {
            jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
            setOperations(['1']);
            fill('11:00');
            sendEvent.mockClear();

            await submit();

            expect(postOperationSighting).not.toHaveBeenCalled();
            expect(
                component.sightingForm.controls.sightingTime.getError(
                    'precheck',
                ),
            ).toBe('future_time');
            expect(
                component.sightingForm.controls.operationNumber.getError(
                    'precheck',
                ),
            ).toBe('operation_not_found');
            expect(sendEvent).toHaveBeenCalledWith('sighting_submit_blocked', {
                source: 'top_card',
                reason: 'future_time',
            });
        });

        it('precheckMessage は止めた理由の文言を返し、止めていなければ空', async () => {
            jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
            setOperations(['1']);
            expect(component.precheckMessage('operationNumber')).toBe('');
            fill('11:00');

            await submit();

            expect(component.precheckMessage('operationNumber')).toBe(
                '指定された運用番号の運用情報が見つかりません',
            );
            expect(component.precheckMessage('sightingTime')).toBe(
                '未来の時刻は指定できません',
            );
        });

        describe('4 時をまたいだ後の一覧', () => {
            const operations = (numbers: string[]) =>
                of(
                    numbers.map(
                        (n) =>
                            ({
                                operationId: `op${n}`,
                                operationNumber: n,
                            }) as unknown as OperationDetailsDto,
                    ),
                );

            // 11/7（平日）に一覧を取り、11/8 07:00（休日）に送る
            const staleSetup = (): void => {
                jest.useFakeTimers({ now: new Date(2026, 10, 7, 10, 0) });
                findCalendar.mockReturnValue(of({ calendarId: 'weekday' }));
                TestBed.inject(TodaysCalendarListState).fetch().subscribe();
                setOperations(['1']);
                jest.setSystemTime(new Date(2026, 10, 8, 7, 0));
                findCalendar.mockReturnValue(of({ calendarId: 'holiday' }));
                findOperations.mockReturnValue(operations(['1', '12']));
            };

            it('前の営業日の一覧に無い番号でも、引き直してから確かめて通す', async () => {
                staleSetup();
                fill();

                await submit();

                expect(findCalendar).toHaveBeenLastCalledWith({
                    date: '2026-11-08',
                });
                expect(findOperations).toHaveBeenCalledWith({
                    calendarId: 'holiday',
                });
                expect(postOperationSighting).toHaveBeenCalledTimes(1);
                expect(
                    component.sightingForm.controls.operationNumber.getError(
                        'precheck',
                    ),
                ).toBeNull();
            });

            it('引き直しに失敗したら運用番号の確かめは飛ばして送る', async () => {
                staleSetup();
                findCalendar.mockReturnValue(throwError(() => new Error('x')));
                fill();

                await submit();

                expect(postOperationSighting).toHaveBeenCalledTimes(1);
            });

            it('一覧の取り直しが途中で失敗したら、次の送信でまた取り直す', async () => {
                staleSetup();
                findOperations.mockReturnValueOnce(
                    throwError(() => new Error('x')),
                );
                fill();

                // 失敗した回: 運用番号の確かめは飛ばして送る
                await submit();
                expect(postOperationSighting).toHaveBeenCalledTimes(1);
                expect(findCalendar).toHaveBeenCalledTimes(2);

                // 次の回: 取り直しが再び走り、今度は成功して一覧で確かめる
                findOperations.mockReturnValue(operations(['1']));
                await submit();
                expect(findCalendar).toHaveBeenCalledTimes(3);
                expect(findOperations).toHaveBeenCalledTimes(2);
                expect(postOperationSighting).toHaveBeenCalledTimes(1);
            });

            it('引き直した後でも一覧に無い番号は止める', async () => {
                staleSetup();
                findOperations.mockReturnValue(operations(['1']));
                fill();

                await submit();

                expect(postOperationSighting).not.toHaveBeenCalled();
            });
        });

        it('時刻指定で未来の時刻なら送らず、sightingTime に precheck エラーと sighting_submit_blocked', async () => {
            jest.useFakeTimers({ now: new Date(2026, 9, 8, 10, 0) });
            fill('11:00');
            sendEvent.mockClear();

            await submit();

            expect(postOperationSighting).not.toHaveBeenCalled();
            const control = component.sightingForm.controls.sightingTime;
            expect(control.getError('precheck')).toBe('future_time');
            expect(control.touched).toBe(true);
            expect(sendEvent.mock.calls).toEqual([
                [
                    'sighting_submit_blocked',
                    { source: 'top_card', reason: 'future_time' },
                ],
            ]);
        });

        it('今日に無い運用番号なら送らない。100 は送る', async () => {
            setOperations(['11', '12']);
            fill();
            component.sightingForm.patchValue({ operationNumber: '99' });

            await submit();

            expect(postOperationSighting).not.toHaveBeenCalled();
            expect(
                component.sightingForm.controls.operationNumber.getError(
                    'precheck',
                ),
            ).toBe('operation_not_found');
            expect(sendEvent).toHaveBeenCalledWith('sighting_submit_blocked', {
                source: 'top_card',
                reason: 'operation_not_found',
            });

            component.sightingForm.patchValue({ operationNumber: '100' });
            await submit();
            expect(postOperationSighting).toHaveBeenCalledTimes(1);
        });

        it('今日の運用の一覧が空なら運用番号では止めない', async () => {
            fill();
            await submit();
            expect(postOperationSighting).toHaveBeenCalledTimes(1);
        });

        it('今日の編成に無い番号でも送れる（formationNotInToday は true）', async () => {
            setFormations([{ agencyId: 'sotetsu', formationNumber: '10701' }]);
            fill();
            component.sightingForm.patchValue({
                formationOrVehicleNumber: '99999',
            });
            expect(component.formationNotInToday()).toBe(true);

            await submit();

            expect(postOperationSighting).toHaveBeenCalledTimes(1);
        });

        it('formationCandidates は所属で絞り、前方一致で最大 20 件', () => {
            setFormations([
                { agencyId: 'sotetsu', formationNumber: '10701' },
                { agencyId: 'tokyu', formationNumber: '10801' },
                { agencyId: 'sotetsu', formationNumber: '12101' },
                ...Array.from({ length: 30 }, (_, i) => ({
                    agencyId: 'sotetsu',
                    formationNumber: `2${String(i).padStart(4, '0')}`,
                })),
            ]);
            expect(component.formationCandidates()).toEqual([]);

            component.sightingForm.patchValue({
                formationOrVehicleNumber: '10',
            });
            expect(
                component.formationCandidates().map((f) => f.formationNumber),
            ).toEqual(['10701', '10801']);

            component.sightingForm.patchValue({ agencyId: 'tokyu' });
            expect(
                component.formationCandidates().map((f) => f.formationNumber),
            ).toEqual(['10801']);

            component.sightingForm.patchValue({
                agencyId: 'sotetsu',
                formationOrVehicleNumber: '2',
            });
            expect(component.formationCandidates()).toHaveLength(20);
        });
    });
});

describe('OperationPostFormComponent の表示（テンプレートあり）', () => {
    let fixture: ComponentFixture<OperationPostFormComponent>;

    const setLoggedIn = (loggedIn: boolean): void => {
        patchState(unprotected(TestBed.inject(UserState)), {
            userId: loggedIn ? 'u1' : null,
        });
    };
    const setRegisteredOnly = (on: boolean): void => {
        patchState(unprotected(TestBed.inject(FeatureFlagState)), {
            flags: { registered_only_posting: on },
        });
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPostFormComponent],
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
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: jest.fn() },
                },
                {
                    provide: GoogleAnalyticsService,
                    useValue: { sendEvent: jest.fn() },
                },
                provideRouter([]),
            ],
        }).compileComponents();

        setLoggedIn(true);
        setRegisteredOnly(true);
        jest.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(
            '/operation/real-time',
        );
        fixture = TestBed.createComponent(OperationPostFormComponent);
    });

    it('フラグ on のゲストには入力欄の代わりに案内とログイン・新規登録のボタンを出す', () => {
        setLoggedIn(false);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el).toHaveTextContent('目撃の投稿にはログインが必要です');
        expect(el.querySelector('form')).toBeNull();
        const links = Array.from(el.querySelectorAll('a')).map((a) =>
            decodeURIComponent(a.getAttribute('href') ?? ''),
        );
        expect(links).toContain('/login?return_to=/operation/real-time');
        expect(links).toContain('/register?return_to=/operation/real-time');
    });

    it('viewer にはフォームでなく「投稿できません」を出す', () => {
        patchState(unprotected(TestBed.inject(UserState)), {
            role: 'viewer',
        });
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el).toHaveTextContent('投稿できません');
        expect(el.querySelector('form')).toBeNull();
        expect(el).not.toHaveTextContent('ログインが必要です');
    });

    it('viewer でもフラグ off ならフォームを出さない', () => {
        setRegisteredOnly(false);
        patchState(unprotected(TestBed.inject(UserState)), {
            role: 'viewer',
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('reporter にはフォームを出す', () => {
        patchState(unprotected(TestBed.inject(UserState)), {
            role: 'reporter',
        });
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('form')).not.toBeNull();
        expect(el).not.toHaveTextContent('投稿できません');
    });

    it('フラグ off のゲストにはフォームを出す（案内は出さない）', () => {
        setRegisteredOnly(false);
        setLoggedIn(false);
        fixture.detectChanges();

        const el: HTMLElement = fixture.nativeElement;
        expect(el.querySelector('form')).not.toBeNull();
        expect(el).not.toHaveTextContent('目撃の投稿にはログインが必要です');
    });

    it('ゲストの案内を出しても、ホスト要素が :empty にならない（main > :empty は隠れる）', () => {
        setLoggedIn(false);
        fixture.detectChanges();

        const host: HTMLElement = fixture.nativeElement;
        expect(host.matches(':empty')).toBe(false);
        Array.from(host.children).forEach((child) => {
            expect(child.matches(':empty')).toBe(false);
        });
    });

    it('ログイン済みなら、フラグ on でもフォームを出す', () => {
        setLoggedIn(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('ログイン済みなら、フラグ off でもフォームを出す', () => {
        setRegisteredOnly(false);
        setLoggedIn(true);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    });

    it('表示中にフラグが on に変わると、ゲストには案内に替わる', () => {
        setRegisteredOnly(false);
        setLoggedIn(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).not.toBeNull();

        setRegisteredOnly(true);
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('form')).toBeNull();
        expect(fixture.nativeElement).toHaveTextContent(
            '目撃の投稿にはログインが必要です',
        );
    });

    it('投稿中にログアウトしたら（フラグ on なら）案内に切り替わる', () => {
        setRegisteredOnly(true);
        setLoggedIn(true);
        fixture.detectChanges();
        setLoggedIn(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });
});
