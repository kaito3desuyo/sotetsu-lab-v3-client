import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeFilterComponent } from './operation-real-time-filter.component';

describe('OperationRealTimeFilterComponent', () => {
    let component: OperationRealTimeFilterComponent;
    let fixture: ComponentFixture<OperationRealTimeFilterComponent>;

    beforeEach(async () => {
        OperationRealTimeStore.setOperationGroups([
            { groupName: '1群', operationNumbers: ['11', '12'] },
            { groupName: '9G群', operationNumbers: ['91G', '92G'] },
        ]);
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFilterComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationRealTimeStore.setOperationGroups([]);
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('運用群チップに「休」の疑似グループが末尾に追加される', () => {
        const options = component.groupOptions();
        expect(options.map((o) => o.value)).toEqual([
            '1群',
            '9G群',
            '休',
        ]);
    });

    it('onAgencyChange で選択会社をストアへ書き込む', () => {
        component.onAgencyChange(['agency-1']);
        expect(OperationRealTimeStore.selectedAgencyIds$).toBeDefined();
        component.selectedAgencyIds();
        fixture.detectChanges();
        expect(component.selectedAgencyIds()).toEqual(['agency-1']);
    });

    it('onGroupChange で選択群をストアへ書き込む', () => {
        component.onGroupChange(['1群']);
        fixture.detectChanges();
        expect(component.selectedGroupNames()).toEqual(['1群']);
    });

    it('chipOptions は運用群チップにオレンジ（accent）の選択色を付けて1行に統合する', () => {
        const options = component.chipOptions();
        expect(options.map((o) => o.value)).toEqual(['1群', '9G群', '休']);
        expect(options.every((o) => o.selectedColor === 'accent')).toBe(true);
    });

    it('onChipsChange は群名のみをストアの選択群へ振り分ける', () => {
        component.onChipsChange(['1群', '休']);
        fixture.detectChanges();
        expect(component.selectedGroupNames()).toEqual(['1群', '休']);
        expect(component.selectedAgencyIds()).toEqual([]);
    });

    it('selectedValues は会社と群の選択値を連結して返す', () => {
        component.onGroupChange(['9G群']);
        fixture.detectChanges();
        expect(component.selectedValues()).toEqual(['9G群']);
    });
});
