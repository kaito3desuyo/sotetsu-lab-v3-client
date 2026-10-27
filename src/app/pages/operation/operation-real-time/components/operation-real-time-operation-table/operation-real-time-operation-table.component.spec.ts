import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeOperationTableComponent } from './operation-real-time-operation-table.component';

const operation = (operationNumber: string) =>
    ({
        operationId: `op-${operationNumber}`,
        operationNumber,
    }) as OperationDetailsDto;

const expecting = (formationId: string) =>
    ({
        expectedSighting: { formation: { formationId } },
    }) as OperationSightingTimeCrossSectionDto;

async function createTable(): Promise<
    ComponentFixture<OperationRealTimeOperationTableComponent>
> {
    await TestBed.configureTestingModule({
        imports: [OperationRealTimeOperationTableComponent],
        providers: [
            {
                provide: AgencyListState,
                useValue: { agencies: signal([]) },
            },
        ],
    })
        .overrideComponent(OperationRealTimeOperationTableComponent, {
            set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
        })
        .compileComponents();

    const fixture = TestBed.createComponent(
        OperationRealTimeOperationTableComponent,
    );
    fixture.detectChanges();
    return fixture;
}

// ストアはこのファイルの中で共有される。運用をまだ入れていない状態を見るため、先頭に置く
describe('OperationRealTimeOperationTableComponent（運用を取る前）', () => {
    it('空表示の代わりに、画面からヘッダーを引いた高さで骨組みを出す', async () => {
        const el: HTMLElement = (await createTable()).nativeElement;

        expect(el.querySelector('app-empty-state')).toBeNull();
        const placeholder = el.querySelector(
            '[data-testid="operation-table-placeholder"]',
        );
        expect(placeholder?.className).toContain('tw-h-[calc(100dvh-48px)]');
        expect(placeholder?.className).toContain('md:tw-h-[calc(100dvh-64px)]');
        expect(
            placeholder?.querySelector(
                'app-operation-real-time-skeleton-ledger',
            ),
        ).not.toBeNull();
    });
});

describe('OperationRealTimeOperationTableComponent（運用が 0 件）', () => {
    it('取った結果が 0 件なら、空表示を出す', async () => {
        OperationRealTimeStore.setOperations([]);

        const el: HTMLElement = (await createTable()).nativeElement;

        expect(el.querySelector('app-empty-state')).not.toBeNull();
        expect(
            el.querySelector('[data-testid="operation-table-placeholder"]'),
        ).toBeNull();
    });
});

describe('OperationRealTimeOperationTableComponent', () => {
    let component: OperationRealTimeOperationTableComponent;
    let fixture: ComponentFixture<OperationRealTimeOperationTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeOperationTableComponent],
            providers: [
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal([]) },
                },
            ],
        })
            .overrideComponent(OperationRealTimeOperationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.setOperations([
            operation('12'),
            operation('100'),
            operation('51'),
        ]);
        OperationRealTimeStore.setFormations([
            { formationId: 'f-10701', agencyId: 'sotetsu' },
            { formationId: 'f-5101', agencyId: 'tokyu' },
        ] as FormationDetailsDto[]);
        OperationRealTimeStore.setOperationSightingTimeCrossSection(
            '12',
            expecting('f-10701'),
        );
        OperationRealTimeStore.setOperationSightingTimeCrossSection(
            '51',
            expecting('f-5101'),
        );
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);

        fixture = TestBed.createComponent(
            OperationRealTimeOperationTableComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    const numbers = () =>
        component.filteredOperations().map((o) => o.operationNumber);

    it('休車の 100 を除いた運用を出す', () => {
        expect(numbers()).toEqual(['12', '51']);
    });

    it('運用群は運用番号で、会社は予想編成の所属会社で絞り込む', () => {
        OperationRealTimeStore.setSelectedGroupNames(['5群']);
        expect(numbers()).toEqual(['51']);

        OperationRealTimeStore.setSelectedGroupNames([]);
        OperationRealTimeStore.setSelectedAgencyIds(['sotetsu']);
        expect(numbers()).toEqual(['12']);
    });

    it('運用番号で断面・履歴・現在位置を引き、無ければ空で返す', () => {
        const position = {} as OperationCurrentPositionDto;
        OperationRealTimeStore.setCurrentPosition('12', position);

        expect(component.queryCurrentPositionByOperationNumber('12')()).toBe(
            position,
        );
        expect(
            component.queryTimeCrossSectionByOperationNumber('99')(),
        ).toBeUndefined();
        expect(component.queryHistoriesByOperationNumber('99')()).toEqual([]);
    });
});
