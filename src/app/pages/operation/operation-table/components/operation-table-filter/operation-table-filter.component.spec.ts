import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperationTableStore } from '../../stores/operation-table.store';
import { OperationTableFilterComponent } from './operation-table-filter.component';

describe('OperationTableFilterComponent', () => {
    let component: OperationTableFilterComponent;
    let fixture: ComponentFixture<OperationTableFilterComponent>;

    beforeEach(async () => {
        OperationTableStore.setSelectedGroupNames([]);

        await TestBed.configureTestingModule({
            imports: [OperationTableFilterComponent],
        }).compileComponents();

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

    afterEach(() => {
        OperationTableStore.setSelectedGroupNames([]);
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
});
