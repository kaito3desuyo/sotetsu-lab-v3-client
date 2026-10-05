import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormTripsComponent } from './timetable-edit-form-trips.component';

function makeStation(stationId: string): any {
    return { stationId, stationName: stationId, routeStationLists: [] };
}

describe('TimetableEditFormTripsComponent', () => {
    let component: TimetableEditFormTripsComponent;
    let fixture: ComponentFixture<TimetableEditFormTripsComponent>;
    let breakpoint$: BehaviorSubject<BreakpointState>;

    const stations = [makeStation('横浜'), makeStation('二俣川')];

    beforeEach(async () => {
        breakpoint$ = new BehaviorSubject<BreakpointState>({
            matches: false,
            breakpoints: {},
        });

        await TestBed.configureTestingModule({
            imports: [TimetableEditFormTripsComponent],
            providers: [
                {
                    provide: BreakpointObserver,
                    useValue: { observe: () => breakpoint$ },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormTripsComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('serviceId', 'service-1');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
        fixture.componentRef.setInput('tripDirection', ETripDirection.OUTBOUND);
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput(
            'visibleStationIds',
            stations.map((s) => s.stationId),
        );
        fixture.componentRef.setInput('operations', []);
        fixture.componentRef.setInput('tripClasses', []);
        fixture.componentRef.setInput('trips', []);

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ADD モードでは1件分の空 trip フォームで初期化される（現行と同じ既定挙動）', () => {
        expect(component.tripsForm.controls.length).toBe(1);
        expect(component.tripsForm.controls[0].get('times').value.length).toBe(
            stations.length,
        );
    });

    it('B8-1: visibleStations は visibleStationIds に含まれる駅のみを返す（情報削減ではなく表示絞り込み）', () => {
        fixture.componentRef.setInput('visibleStationIds', ['二俣川']);
        fixture.detectChanges();

        expect(component.visibleStations().map((s) => s.stationId)).toEqual([
            '二俣川',
        ]);
        // フォーム自体は駅データを保持したまま（全駅ぶんの times コントロールは維持）
        expect(component.tripsForm.controls[0].get('times').value.length).toBe(
            stations.length,
        );
    });

    it('B8-3: 一括オフセットは全 trip の全時刻へ適用される', () => {
        component.onClickAdd();
        fixture.detectChanges();

        for (const tripForm of component.tripsForm.controls) {
            const times = tripForm.get('times') as FormArray;
            times
                .at(0)
                .patchValue({ arrivalTime: '10:00', departureTime: '10:05' });
        }

        component.offsetMinutes.set(15);
        component.onApplyOffset();

        for (const tripForm of component.tripsForm.controls) {
            const times = tripForm.get('times') as FormArray;
            expect(times.at(0).get('arrivalTime').value).toBe('10:15');
            expect(times.at(0).get('departureTime').value).toBe('10:20');
        }
    });

    it('B8-6: restoreTrips が与えられると下書きの trips でフォームを再構築し restored を emit する', () => {
        const restoredSpy = jest.fn();
        component.restored.subscribe(restoredSpy);

        fixture.componentRef.setInput('restoreTrips', [
            {
                tripId: 'trip-1',
                tripNumber: '999',
                times: [],
            },
        ]);
        fixture.detectChanges();

        expect(component.tripsForm.controls.length).toBe(1);
        expect(component.tripsForm.controls[0].get('tripNumber').value).toBe(
            '999',
        );
        expect(restoredSpy).toHaveBeenCalled();
    });

    it('下書きを戻すと、保存したときのフォームの値（停・通過・時刻・運用）がそのまま戻る', () => {
        const trip = component.tripsForm.controls[0];
        trip.patchValue({
            tripNumber: '3030',
            tripClassId: 'class-1',
            operationId: 'operation-54',
        });
        (trip.get('times') as FormArray).at(0).patchValue({
            stopType: ETimetableEditFormStopType.STOP,
            departureTime: '11:54',
        });
        (trip.get('times') as FormArray).at(1).patchValue({
            stopType: ETimetableEditFormStopType.PASS,
        });
        const saved = component.tripsForm.getRawValue();

        component.onClickAdd();
        fixture.componentRef.setInput(
            'restoreTrips',
            JSON.parse(JSON.stringify(saved)),
        );
        fixture.detectChanges();

        expect(component.tripsForm.getRawValue()).toEqual(saved);
    });

    describe('G9: 種別バッジ・下書き保存ボタン', () => {
        it('onClickSaveDraft は formValueChange と saveDraftClick を emit する', () => {
            const formValueChangeSpy = jest.fn();
            const saveDraftClickSpy = jest.fn();
            component.formValueChange.subscribe(formValueChangeSpy);
            component.saveDraftClick.subscribe(saveDraftClickSpy);

            component.onClickSaveDraft();

            expect(formValueChangeSpy).toHaveBeenCalled();
            expect(saveDraftClickSpy).toHaveBeenCalled();
        });
    });

    describe('G9 defect 2: 初期値取り込みブロックの表示と ADD モードのコピー元プリフィル', () => {
        it('isInitialValueBlockVisible は ADD/COPY で true・UPDATE で false（mock06 新規画面で表示）', () => {
            fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
            fixture.detectChanges();
            expect(component.isInitialValueBlockVisible()).toBe(true);

            fixture.componentRef.setInput('mode', ETimetableEditFormMode.COPY);
            fixture.detectChanges();
            expect(component.isInitialValueBlockVisible()).toBe(true);

            fixture.componentRef.setInput(
                'mode',
                ETimetableEditFormMode.UPDATE,
            );
            fixture.detectChanges();
            expect(component.isInitialValueBlockVisible()).toBe(false);
        });

        it('初期値取り込みブロックが ADD モードの DOM に描画される（既存列車からコピー・一括オフセット）', () => {
            fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
            fixture.detectChanges();

            const text: string = fixture.nativeElement.textContent;
            expect(text).toContain('初期値の取り込み');
            expect(text).toContain('既存列車からコピー');
            expect(text).toContain('一括オフセット');
        });

        it('ADD モードでコピー元 trips が渡されるとプリフィルされる（従前は空1件で無視していた）', () => {
            fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
            fixture.componentRef.setInput('trips', [
                { tripId: 't1', tripNumber: '2303', times: [] },
                { tripId: 't2', tripNumber: '2305', times: [] },
            ]);
            fixture.detectChanges();

            expect(component.tripsForm.controls.length).toBe(2);
            expect(
                component.tripsForm.controls[0].get('tripNumber').value,
            ).toBe('2303');
        });

        it('ADD モードでコピー元未選択（trips 空）なら従前どおり空1件で初期化される', () => {
            fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
            fixture.componentRef.setInput('trips', []);
            fixture.detectChanges();

            expect(component.tripsForm.controls.length).toBe(1);
        });
    });

    describe('G9: 路線チップ折り畳みの要約テキスト', () => {
        it('全路線選択時（既定）は「全路線」と表示する', () => {
            fixture.componentRef.setInput('routes', [
                { routeId: 'r1', routeName: '本線' },
                { routeId: 'r2', routeName: 'いずみ野線' },
            ]);
            fixture.componentRef.setInput('selectedRouteIds', ['r1', 'r2']);
            fixture.detectChanges();

            expect(component.routeFilterSummary()).toBe('全路線');
        });

        it('一部路線のみ選択時は選択路線名を「、」区切りで表示する', () => {
            fixture.componentRef.setInput('routes', [
                { routeId: 'r1', routeName: '本線' },
                { routeId: 'r2', routeName: 'いずみ野線' },
            ]);
            fixture.componentRef.setInput('selectedRouteIds', ['r1']);
            fixture.detectChanges();

            expect(component.routeFilterSummary()).toBe('本線');
        });

        it('何も選んでいないときは全部出すので「全路線」と表示する', () => {
            fixture.componentRef.setInput('routes', [
                { routeId: 'r1', routeName: '本線' },
                { routeId: 'r2', routeName: 'いずみ野線' },
            ]);
            fixture.componentRef.setInput('selectedRouteIds', []);
            fixture.detectChanges();

            expect(component.routeFilterSummary()).toBe('全路線');
        });
    });

    describe('格子の組み込み', () => {
        it('PC 幅では全列車を格子に出す', () => {
            component.onClickAdd();
            fixture.detectChanges();

            expect(component.isCompact()).toBe(false);
            expect(component.shownTripIndexes()).toEqual([0, 1]);
        });

        it('スマホ幅では今の 1 列車だけを出し、追加するとその列車へ移る', () => {
            breakpoint$.next({ matches: true, breakpoints: {} });
            fixture.detectChanges();

            expect(component.shownTripIndexes()).toEqual([0]);

            component.onClickAdd();
            fixture.detectChanges();

            expect(component.currentTripIndex()).toBe(1);
            expect(component.shownTripIndexes()).toEqual([1]);
        });

        it('片方の配置だけを描く（スマホの列車送りは PC では描かない）', () => {
            const pcText: string = fixture.nativeElement.textContent;
            expect(pcText).not.toContain('列車目');

            breakpoint$.next({ matches: true, breakpoints: {} });
            fixture.detectChanges();

            const compactText: string = fixture.nativeElement.textContent;
            expect(compactText).toContain('1 / 1 列車目');
        });

        it('経由なしの駅でも時刻の control を無効にしない（無効は格子が描画時に決める）', () => {
            const time = (
                component.tripsForm.controls[0].get('times') as FormArray
            ).at(0);

            expect(time.get('stopType').value).toBe('not-going-through');
            expect(time.get('arrivalTime').disabled).toBe(false);
            expect(time.get('departureTime').disabled).toBe(false);
        });

        it('保存ボタンのラベルは ADD で「登録する」、UPDATE で「更新する」', () => {
            expect(component.submitButtonLabel()).toBe('登録する');

            fixture.componentRef.setInput(
                'mode',
                ETimetableEditFormMode.UPDATE,
            );
            fixture.detectChanges();

            expect(component.submitButtonLabel()).toBe('更新する');
        });

        it('格子を描く', () => {
            expect(
                fixture.nativeElement.querySelector(
                    'app-timetable-edit-form-grid',
                ),
            ).not.toBeNull();
        });
    });

    describe('保存の DTO（格子に置き換えても変えない）', () => {
        it('経由なしを除き、始発の着・終着の発を捨て、停車種別を乗降区分にする', () => {
            fixture.componentRef.setInput('stations', [
                makeStation('横浜'),
                makeStation('西谷'),
                makeStation('二俣川'),
            ]);
            fixture.componentRef.setInput('visibleStationIds', [
                '横浜',
                '西谷',
                '二俣川',
            ]);
            fixture.detectChanges();

            const tripForm = component.tripsForm.controls[0];
            tripForm.patchValue({ tripNumber: '1001', tripClassId: 'tc-1' });
            const times = tripForm.get('times') as FormArray;
            times.at(0).patchValue({
                stopType: 'stop',
                arrivalTime: '09:58',
                departureTime: '10:00',
            });
            times.at(1).patchValue({
                stopType: 'not-going-through',
                arrivalTime: '10:03',
                departureTime: '10:04',
            });
            times.at(2).patchValue({
                stopType: 'stop',
                arrivalTime: '10:08',
                departureTime: '10:09',
            });

            const spy = jest.fn();
            component.clickSubmit.subscribe(spy);
            component.onClickSubmit();

            const [dto] = spy.mock.calls[0][0];
            expect(dto.tripNumber).toBe('1001');
            expect(
                dto.times.map((t: any) => ({
                    stationId: t.stationId,
                    stopSequence: t.stopSequence,
                    pickupType: t.pickupType,
                    dropoffType: t.dropoffType,
                    arrivalTime: t.arrivalTime,
                    arrivalDays: t.arrivalDays,
                    departureTime: t.departureTime,
                    departureDays: t.departureDays,
                })),
            ).toEqual([
                {
                    stationId: '横浜',
                    stopSequence: 1,
                    pickupType: 0,
                    dropoffType: 1,
                    arrivalTime: null,
                    arrivalDays: null,
                    departureTime: '10:00',
                    departureDays: 1,
                },
                {
                    stationId: '二俣川',
                    stopSequence: 2,
                    pickupType: 1,
                    dropoffType: 0,
                    arrivalTime: '10:08',
                    arrivalDays: 1,
                    departureTime: null,
                    departureDays: null,
                },
            ]);
        });

        it('0 時台の時刻は days = 2', () => {
            const tripForm = component.tripsForm.controls[0];
            const times = tripForm.get('times') as FormArray;
            times
                .at(0)
                .patchValue({ stopType: 'stop', departureTime: '23:58' });
            times.at(1).patchValue({ stopType: 'stop', arrivalTime: '00:03' });

            const spy = jest.fn();
            component.clickSubmit.subscribe(spy);
            component.onClickSubmit();

            const [dto] = spy.mock.calls[0][0];
            expect(dto.times[0].departureDays).toBe(1);
            expect(dto.times[1].arrivalDays).toBe(2);
        });
    });
});
