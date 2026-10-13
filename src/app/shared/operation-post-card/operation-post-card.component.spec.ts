import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroupDirective } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { FetchError } from 'src/app/core/classes/custom-error';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { TodaysFormationListStateQuery } from 'src/app/global-states/todays-formation-list.state';
import { LoadingService } from '../loading/loading.service';
import { OperationPostCardComponent } from './operation-post-card.component';
import { OperationPostCardService } from './operation-post-card.service';

describe('OperationPostCardComponent', () => {
    let component: OperationPostCardComponent;
    let fixture: ComponentFixture<OperationPostCardComponent>;
    let postOperationSighting: jest.Mock;
    let emitSubmitEvent: jest.Mock;
    let snackBarOpen: jest.Mock;
    let socketEmit: jest.Mock;
    let handleError: jest.Mock;
    let resetForm: jest.Mock;
    let sendEvent: jest.Mock;

    beforeEach(async () => {
        postOperationSighting = jest.fn(() => of(undefined));
        emitSubmitEvent = jest.fn();
        snackBarOpen = jest.fn();
        socketEmit = jest.fn();
        handleError = jest.fn();
        resetForm = jest.fn();
        sendEvent = jest.fn();

        await TestBed.configureTestingModule({
            imports: [OperationPostCardComponent],
            providers: [
                {
                    provide: OperationPostCardService,
                    useValue: {
                        fetchServiceAgencies: () => of(undefined),
                        postOperationSighting,
                        emitSubmitEvent,
                    },
                },
                {
                    provide: TodaysFormationListStateQuery,
                    useValue: { todaysFormations$: of([]) },
                },
                {
                    provide: LoadingService,
                    useValue: { open: jest.fn(), close: jest.fn() },
                },
                { provide: ErrorHandlerService, useValue: { handleError } },
                { provide: SocketService, useValue: { emit: socketEmit } },
                { provide: GoogleAnalyticsService, useValue: { sendEvent } },
            ],
        })
            .overrideComponent(OperationPostCardComponent, {
                set: { template: '', imports: [] },
            })
            .overrideProvider(MatSnackBar, {
                useValue: { open: snackBarOpen },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPostCardComponent);
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

    const submit = () =>
        component.submit({ resetForm } as unknown as FormGroupDirective);

    const postedTime = () =>
        new Date(postOperationSighting.mock.calls[0][0].sightingTime);

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
        expect(socketEmit).toHaveBeenCalledWith(
            'sendSighting',
            expect.anything(),
        );
        expect(emitSubmitEvent).toHaveBeenCalled();
    });

    it('昼間に 4 時より前の時刻を指定したら、翌日のその時刻にする', async () => {
        jest.useFakeTimers({ now: new Date(2026, 9, 8, 23, 0) });
        fill('01:30');

        await submit();

        expect(postedTime()).toEqual(new Date(2026, 9, 9, 1, 30));
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

    const eventNames = () => sendEvent.mock.calls.map(([name]) => name);

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
            ['sighting_submit'],
            [
                'sighting_submit_failure',
                { error_message: '編成が見つかりません' },
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
            error_message: 'あ'.repeat(100),
        });
    });
});
