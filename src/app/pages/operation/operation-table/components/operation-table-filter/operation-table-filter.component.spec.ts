import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { OperationTableStore } from '../../stores/operation-table.store';
import { OperationTableFilterComponent } from './operation-table-filter.component';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';

const deviceStorageStub = {
    provide: DeviceStorage,
    useValue: {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
    },
};

describe('OperationTableFilterComponent', () => {
    let component: OperationTableFilterComponent;
    let fixture: ComponentFixture<OperationTableFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableFilterComponent],
            providers: [deviceStorageStub],
        }).compileComponents();
        setTodaysCalendars(['today']);

        fixture = TestBed.createComponent(OperationTableFilterComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput(
            'operationTrips',
            ['11', '12', '91G', '92G', '79'].map((operationNumber) => ({
                operation: { operationNumber },
                trips: [],
            })),
        );
        fixture.componentRef.setInput('calendars', []);
        fixture.componentRef.setInput('calendarId', null);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('運用群チップは運用番号から導き、「休」を末尾に足す（リアルタイム運用情報と同じ）', () => {
        const options = component.groupOptions();
        // 79 は API の群定義から漏れていた運用番号。導出なら 7群として出る
        expect(options.map((o) => o.value)).toEqual([
            '1群',
            '7群',
            'G群（東横線）',
            '休',
        ]);
    });

    it('onGroupChange で選択群をストアへ書き込む（データ再取得はしない）', () => {
        component.onGroupChange(['1群']);
        fixture.detectChanges();
        expect(component.selectedGroupNames()).toEqual(['1群']);
    });

    it('群チップには群の見本色を付ける（リアルタイム運用情報と同じ）', () => {
        const options = component.groupOptions();
        expect(options.every((o) => !!o.color)).toBe(true);
    });

    it('onCalendarChange で calendarChange イベントを発火する', () => {
        const spy = jest.fn();
        component.calendarChange.subscribe(spy);
        component.onCalendarChange('calendar-2');
        expect(spy).toHaveBeenCalledWith('calendar-2');
    });

    it('onCalendarChange: 現在と同じ calendarId では発火しない', () => {
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.detectChanges();
        const spy = jest.fn();
        component.calendarChange.subscribe(spy);
        component.onCalendarChange('calendar-1');
        expect(spy).not.toHaveBeenCalled();
    });

    it('「今日」を押すと、今日のダイヤを calendarChange で流す', () => {
        fixture.componentRef.setInput('calendarId', 'old');
        fixture.detectChanges();
        const emitted: string[] = [];
        component.calendarChange.subscribe((id: string) => emitted.push(id));

        const today = (fixture.nativeElement as HTMLElement).querySelector(
            'app-today-calendar-button button',
        ) as HTMLButtonElement;
        today.click();
        expect(emitted).toEqual(['today']);
    });
});

describe('OperationTableFilterComponent の読み込み中', () => {
    let fixture: ComponentFixture<OperationTableFilterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationTableFilterComponent],
            providers: [deviceStorageStub],
        })
            .overrideComponent(OperationTableFilterComponent, {
                set: {
                    imports: [DateFnsPipe, LazyOptionsDirective],
                    schemas: [NO_ERRORS_SCHEMA],
                },
            })
            .compileComponents();
        fixture = TestBed.createComponent(OperationTableFilterComponent);
        fixture.componentRef.setInput('operationTrips', []);
        fixture.componentRef.setInput('calendars', []);
    });

    it('運用を取る前は、運用群のチップの代わりにチップの形の骨組みを出す', () => {
        TestBed.inject(OperationTableStore).setHasFetchedOperationTrips(false);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).not.toBeNull();
        expect(el.querySelector('app-filter-chips')).toBeNull();
    });

    it('運用を取った後は、運用群のチップを出す', () => {
        TestBed.inject(OperationTableStore).setHasFetchedOperationTrips(true);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('app-skeleton-chips')).toBeNull();
        expect(el.querySelector('app-filter-chips')).not.toBeNull();
    });
});
