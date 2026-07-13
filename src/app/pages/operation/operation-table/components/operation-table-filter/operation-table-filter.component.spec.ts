import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperationTableStore } from '../../stores/operation-table.store';
import { OperationTableFilterComponent } from './operation-table-filter.component';

describe('OperationTableFilterComponent', () => {
    let component: OperationTableFilterComponent;
    let fixture: ComponentFixture<OperationTableFilterComponent>;

    beforeEach(async () => {
        OperationTableStore.setOperationGroups([
            { groupName: '1群', operationNumbers: ['11', '12'] },
            { groupName: '9G群', operationNumbers: ['91G', '92G'] },
        ]);
        OperationTableStore.setSelectedGroupNames([]);

        await TestBed.configureTestingModule({
            imports: [OperationTableFilterComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationTableFilterComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('operationTrips', []);
        fixture.componentRef.setInput('calendars', []);
        fixture.componentRef.setInput('calendarId', null);
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationTableStore.setOperationGroups([]);
        OperationTableStore.setSelectedGroupNames([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('運用群チップに「休」の疑似グループが末尾に追加される', () => {
        const options = component.groupOptions();
        expect(options.map((o) => o.value)).toEqual(['1群', '9G群', '休']);
    });

    it('onGroupChange で選択群をストアへ書き込む（データ再取得はしない）', () => {
        component.onGroupChange(['1群']);
        fixture.detectChanges();
        expect(component.selectedGroupNames()).toEqual(['1群']);
    });

    it('onJumpChange で jump イベントを発火する', () => {
        const spy = jest.fn();
        component.jump.subscribe(spy);
        component.onJumpChange('11');
        expect(spy).toHaveBeenCalledWith('11');
    });

    it('onJumpChange: 空値では jump イベントを発火しない', () => {
        const spy = jest.fn();
        component.jump.subscribe(spy);
        component.onJumpChange('');
        expect(spy).not.toHaveBeenCalled();
    });

    it('群チップにパステル群色を付けない（モック 03: 選択色は scss の accent で統一）', () => {
        const options = component.groupOptions();
        expect(options.every((o) => o.color === undefined)).toBe(true);
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
