import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
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

// ストアはこのファイルの中で共有される。運用・編成をまだ入れていない状態を見るため、先頭に置く
describe('OperationRealTimeFilterComponent（運用・編成を取る前）', () => {
    it('チップの 2 行とも、チップの形の骨組みを出す（「休」だけを先に出さない）', async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFilterComponent],
            providers: [
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal([]) },
                },
                {
                    provide: RouteStationListState,
                    useValue: { routeStations: signal([]) },
                },
            ],
        }).compileComponents();
        const fixture = TestBed.createComponent(
            OperationRealTimeFilterComponent,
        );
        fixture.detectChanges();
        const el: HTMLElement = fixture.nativeElement;

        expect(el.querySelectorAll('app-filter-chips')).toHaveLength(0);
        const skeletons = el.querySelectorAll(
            '[data-testid="filter-chips-skeleton"]',
        );
        expect(skeletons).toHaveLength(2);
        for (const skeleton of Array.from(skeletons)) {
            expect(skeleton.className).toContain('tw-h-[42px]');
        }
    });
});

describe('OperationRealTimeFilterComponent', () => {
    let component: OperationRealTimeFilterComponent;
    let fixture: ComponentFixture<OperationRealTimeFilterComponent>;
    let agencies: WritableSignal<AgencyDetailsDto[]>;

    beforeEach(async () => {
        OperationRealTimeStore.setOperations(
            ['11', '12', '91G', '92G'].map(operationOf),
        );
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);

        agencies = signal<AgencyDetailsDto[]>([]);

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFilterComponent],
            providers: [
                { provide: AgencyListState, useValue: { agencies } },
                {
                    provide: RouteStationListState,
                    useValue: { routeStations: signal([]) },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeFilterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        OperationRealTimeStore.setOperations([]);
        OperationRealTimeStore.setFormations([]);
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('チップの 2 行は、選択肢が空でも 1 行分の高さを取っておく', () => {
        OperationRealTimeStore.setFormations([]);
        fixture.detectChanges();

        const rows: HTMLElement[] = Array.from(
            fixture.nativeElement.querySelectorAll('app-filter-chips'),
        );

        expect(rows).toHaveLength(2);
        for (const row of rows) {
            expect(row.classList).toContain('tw-min-h-[42px]');
        }
    });

    it('運用群チップに「休」の疑似グループが末尾に追加される', () => {
        const options = component.groupOptions();
        expect(options.map((o) => o.value)).toEqual([
            '1群',
            'G群（東横線）',
            '休',
        ]);
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
            'G群（目黒線）',
            'K群（目黒線）',
            'K群（東横線）',
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
        expect(labelsOf(rows[1])).toEqual(['1群', 'G群（東横線）', '休']);
    });

    it('会社チップは、編成を持つ会社だけを出す（選んだままの会社は外せるよう残す）', () => {
        agencies.set([
            { agencyId: 'a-sotetsu', agencyName: '相鉄' },
            { agencyId: 'a-jr', agencyName: 'JR東日本' },
            { agencyId: 'a-tokyu', agencyName: '東急' },
            { agencyId: 'a-seibu', agencyName: '西武' },
        ] as AgencyDetailsDto[]);
        OperationRealTimeStore.setFormations([
            { formationId: 'f-1', agencyId: 'a-sotetsu' },
            { formationId: 'f-2', agencyId: 'a-tokyu' },
        ] as FormationDetailsDto[]);
        OperationRealTimeStore.setSelectedAgencyIds(['a-seibu']);
        fixture.detectChanges();

        expect(component.agencyOptions().map((o) => o.label)).toEqual([
            '相鉄',
            '東急',
            '西武',
        ]);
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
