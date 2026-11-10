import '@testing-library/jest-dom';
import { Component, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { of } from 'rxjs';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TodaysOperationListState } from 'src/app/global-states/todays-operation-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { LoadingService } from '../loading/loading.service';
import { PickableTrain } from '../train-picker/pickable-train.interface';
import { TrainPickerComponent } from '../train-picker/train-picker.component';
import { OperationPostCardService } from './operation-post-card.service';
import { OperationPostFormComponent } from './operation-post-form.component';

/** 列車を選ぶ画面の代わり（フォームとの入れ替えだけを見る） */
@Component({ selector: 'app-train-picker', template: 'picker' })
class StubTrainPickerComponent {
    readonly picked = output<PickableTrain>();
    readonly cancelled = output<void>();
}

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
        openButton.click();
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
            ).value,
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

        await component.submit({
            resetForm: jest.fn(),
        } as unknown as Parameters<typeof component.submit>[0]);
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('mat-error'),
        ).toHaveTextContent('指定された運用番号の運用情報が見つかりません');
    });
});
