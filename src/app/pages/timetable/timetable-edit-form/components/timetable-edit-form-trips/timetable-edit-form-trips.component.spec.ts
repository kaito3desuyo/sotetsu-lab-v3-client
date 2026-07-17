import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray } from '@angular/forms';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ETimetableEditFormMode } from '../../special/enums/timetable-edit-form.enum';
import { TimetableEditFormTripsComponent } from './timetable-edit-form-trips.component';

function makeStation(stationId: string): any {
    return { stationId, stationName: stationId, routeStationLists: [] };
}

describe('TimetableEditFormTripsComponent', () => {
    let component: TimetableEditFormTripsComponent;
    let fixture: ComponentFixture<TimetableEditFormTripsComponent>;

    const stations = [makeStation('横浜'), makeStation('二俣川')];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableEditFormTripsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormTripsComponent);
        component = fixture.componentInstance;

        fixture.componentRef.setInput('serviceId', 'service-1');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.componentRef.setInput('mode', ETimetableEditFormMode.ADD);
        fixture.componentRef.setInput(
            'tripDirection',
            ETripDirection.OUTBOUND,
        );
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
        expect(
            component.tripsForm.controls[0].get('times').value.length,
        ).toBe(stations.length);
    });

    it('B8-1: visibleStations は visibleStationIds に含まれる駅のみを返す（情報削減ではなく表示絞り込み）', () => {
        fixture.componentRef.setInput('visibleStationIds', ['二俣川']);
        fixture.detectChanges();

        expect(component.visibleStations().map((s) => s.stationId)).toEqual([
            '二俣川',
        ]);
        // フォーム自体は駅データを保持したまま（全駅ぶんの times コントロールは維持）
        expect(
            component.tripsForm.controls[0].get('times').value.length,
        ).toBe(stations.length);
    });

    it('B8-3: 一括オフセットは全 trip の全時刻へ適用される', () => {
        component.onClickAdd();
        fixture.detectChanges();

        for (const tripForm of component.tripsForm.controls) {
            const times = tripForm.get('times') as FormArray;
            times.at(0).patchValue({ arrivalTime: '10:00', departureTime: '10:05' });
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

    describe('G9: モバイル1駅1行の停/通トグルと行先導出', () => {
        it('onToggleStopType は 経由なし(既定)→停→通→停 の順で循環する', () => {
            const timeForm = (
                component.tripsForm.controls[0].get('times') as FormArray
            ).at(0) as any;

            expect(timeForm.get('stopType').value).toBe(
                'not-going-through',
            );

            component.onToggleStopType(timeForm);
            expect(timeForm.get('stopType').value).toBe('stop');

            component.onToggleStopType(timeForm);
            expect(timeForm.get('stopType').value).toBe('pass');

            component.onToggleStopType(timeForm);
            expect(timeForm.get('stopType').value).toBe('stop');
        });

        it('isPassStopType は stopType=pass のときのみ true を返す', () => {
            const timeForm = (
                component.tripsForm.controls[0].get('times') as FormArray
            ).at(0) as any;

            expect(component.isPassStopType(timeForm)).toBe(false);

            timeForm.get('stopType').setValue('pass');
            expect(component.isPassStopType(timeForm)).toBe(true);
        });

        it('destinationLabel は経由なしを除いた最後の停車/通過駅名を返す（両方とも経由なしなら空文字）', () => {
            const tripForm = component.tripsForm.controls[0];

            expect(component.destinationLabel(tripForm)).toBe('');

            const times = tripForm.get('times') as FormArray;
            times.at(0).patchValue({ stopType: 'stop' });
            expect(component.destinationLabel(tripForm)).toBe('横浜');

            times.at(1).patchValue({ stopType: 'stop' });
            expect(component.destinationLabel(tripForm)).toBe('二俣川');
        });
    });

    describe('G9: 種別バッジ・下書き保存ボタン', () => {
        it('selectedTripClass は tripClassId に一致する tripClasses の要素を返す', () => {
            fixture.componentRef.setInput('tripClasses', [
                {
                    tripClassId: 'tc-1',
                    tripClassName: '急行',
                    tripClassColor: '#00a040',
                },
            ]);
            fixture.detectChanges();

            const tripForm = component.tripsForm.controls[0];
            tripForm.get('tripClassId').setValue('tc-1');

            expect(component.selectedTripClass(tripForm)?.tripClassName).toBe(
                '急行',
            );
        });

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

            fixture.componentRef.setInput(
                'mode',
                ETimetableEditFormMode.COPY,
            );
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
            fixture.componentRef.setInput('selectedRouteIds', [
                'r1',
                'r2',
            ]);
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
    });
});
