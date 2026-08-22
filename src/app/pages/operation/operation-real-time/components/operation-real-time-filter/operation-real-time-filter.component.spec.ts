import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeFilterComponent } from './operation-real-time-filter.component';

/**
 * 群チップは API の群定義ではなく**実在する運用番号**から導出されるので、
 * seed するのは operations（旧実装は operationGroups を seed していた）。
 */
const operationOf = (operationNumber: string): OperationDetailsDto =>
    ({
        operationId: `id-${operationNumber}`,
        operationNumber,
    }) as OperationDetailsDto;

describe('OperationRealTimeFilterComponent', () => {
    let component: OperationRealTimeFilterComponent;
    let fixture: ComponentFixture<OperationRealTimeFilterComponent>;

    beforeEach(async () => {
        OperationRealTimeStore.setOperations(
            ['11', '12', '91G', '92G'].map(operationOf),
        );
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
        OperationRealTimeStore.setOperations([]);
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('運用群チップに「休」の疑似グループが末尾に追加される', () => {
        const options = component.groupOptions();
        expect(options.map((o) => o.value)).toEqual(['1群', '9G群', '休']);
    });

    it('群チップは実在する運用番号から導出される（API の群定義に依存しない）', () => {
        // API が群を1つも返さなくても、運用番号があればチップが出る。
        // 旧実装では API の群定義に無い運用は絞り込めなかった（74〜79 / K系 / 8群 等）。
        OperationRealTimeStore.setOperations(
            ['79', '86', '01K', '31G', '51K'].map(operationOf),
        );
        fixture.detectChanges();

        // 並びは 記号なし → G → K → 休（docs/design.md 参照）。
        expect(component.groupOptions().map((o) => o.value)).toEqual([
            '7群',
            '8群',
            '3G群',
            '0K群',
            '5K群',
            '休',
        ]);
    });

    it('休（100）が運用一覧に居ても「1群」に混入しない', () => {
        OperationRealTimeStore.setOperations(['11', '100'].map(operationOf));
        fixture.detectChanges();

        expect(component.groupOptions().map((o) => o.value)).toEqual([
            '1群',
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

    it('会社と運用群は別々の app-filter-chips（段を分ける）', () => {
        // 以前は 1 行に混在させ、選択値を onChipsChange で振り分けていた
        // （ユーザー指示 2026-08-22 で段分けに変更）。
        const rows: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('app-filter-chips'),
        );
        expect(rows.length).toBe(2);

        const labelsOf = (row: HTMLElement) =>
            Array.from(row.querySelectorAll('mat-chip-option')).map((chip) =>
                (chip.textContent ?? '').trim(),
            );
        // 1 段目=会社（このテストでは未 seed なので空）/ 2 段目=運用群
        expect(labelsOf(rows[1])).toEqual(['1群', '9G群', '休']);
    });

    it('選択色はページで上書きせず app-filter-chips の既定に委ねる', () => {
        // 既定はオレンジ（accent）。全ページ共通（docs/design.md 色の掟 5）。
        expect(
            component
                .groupOptions()
                .every((o) => o.selectedColor === undefined),
        ).toBe(true);
        expect(
            component
                .agencyOptions()
                .every((o) => o.selectedColor === undefined),
        ).toBe(true);
    });
});
