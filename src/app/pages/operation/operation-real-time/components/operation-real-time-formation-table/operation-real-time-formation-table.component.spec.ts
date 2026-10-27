import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeFormationTableComponent } from './operation-real-time-formation-table.component';

const formation = (formationNumber: string, agencyId: string) =>
    ({
        formationId: `f-${formationNumber}`,
        formationNumber,
        agencyId,
    }) as FormationDetailsDto;

const expecting = (operationNumber: string) =>
    ({
        expectedSighting: { operation: { operationNumber } },
    }) as OperationSightingTimeCrossSectionDto;

const deviceStorageStub = {
    provide: DeviceStorage,
    useValue: {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
    },
};

async function createTable(
    setup?: (store: InstanceType<typeof OperationRealTimeStore>) => void,
): Promise<ComponentFixture<OperationRealTimeFormationTableComponent>> {
    await TestBed.configureTestingModule({
        imports: [OperationRealTimeFormationTableComponent],
        providers: [
            deviceStorageStub,
            {
                provide: AgencyListState,
                useValue: { agencies: signal([]) },
            },
        ],
    })
        .overrideComponent(OperationRealTimeFormationTableComponent, {
            set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
        })
        .compileComponents();

    setup?.(TestBed.inject(OperationRealTimeStore));
    const fixture = TestBed.createComponent(
        OperationRealTimeFormationTableComponent,
    );
    fixture.detectChanges();
    return fixture;
}

describe('OperationRealTimeFormationTableComponent（編成を取る前）', () => {
    it('空表示の代わりに、画面からヘッダーを引いた高さで骨組みを出す', async () => {
        const el: HTMLElement = (await createTable()).nativeElement;

        expect(el.querySelector('app-empty-state')).toBeNull();
        const placeholder = el.querySelector(
            '[data-testid="formation-table-placeholder"]',
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

describe('OperationRealTimeFormationTableComponent（編成が 0 件）', () => {
    it('取った結果が 0 件なら、空表示を出す', async () => {
        const el: HTMLElement = (
            await createTable((store) => store.setFormations([]))
        ).nativeElement;

        expect(el.querySelector('app-empty-state')).not.toBeNull();
        expect(
            el.querySelector('[data-testid="formation-table-placeholder"]'),
        ).toBeNull();
    });
});

describe('OperationRealTimeFormationTableComponent', () => {
    let component: OperationRealTimeFormationTableComponent;
    let fixture: ComponentFixture<OperationRealTimeFormationTableComponent>;
    let store: InstanceType<typeof OperationRealTimeStore>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFormationTableComponent],
            providers: [
                deviceStorageStub,
                {
                    provide: AgencyListState,
                    useValue: { agencies: signal([]) },
                },
            ],
        })
            .overrideComponent(OperationRealTimeFormationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        store = TestBed.inject(OperationRealTimeStore);
        store.setAgencyOrder([]);
        store.setFormations([
            formation('10701', 'sotetsu'),
            formation('10702', 'sotetsu'),
            formation('5101', 'tokyu'),
        ]);
        store.setFormationSightingTimeCrossSection('10701', expecting('12'));
        store.setFormationSightingTimeCrossSection('5101', expecting('31K'));
        store.setSelectedAgencyIds([]);
        store.setSelectedGroupNames([]);

        fixture = TestBed.createComponent(
            OperationRealTimeFormationTableComponent,
        );
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    const numbers = () =>
        component.filteredFormations().map((f) => f.formationNumber);

    it('何も選んでいなければ全部の編成を出す', () => {
        expect(numbers()).toEqual(['5101', '10701', '10702']);
    });

    it('会社で絞り込む', () => {
        store.setSelectedAgencyIds(['sotetsu']);

        expect(numbers()).toEqual(['10701', '10702']);
    });

    it('運用群は、その編成が今入っていると予想される運用の番号で見る', () => {
        store.setSelectedGroupNames(['1群']);

        expect(numbers()).toEqual(['10701']);
    });

    it('現在位置は、予想される運用の現在位置を引く', () => {
        const position = {} as OperationCurrentPositionDto;
        store.setCurrentPosition('12', position);

        expect(component.queryCurrentPositionByFormationNumber('10701')()).toBe(
            position,
        );
        expect(
            component.queryCurrentPositionByFormationNumber('10702')(),
        ).toBeUndefined();
    });

    it('目撃の無い編成は、断面なし・履歴は空で返す', () => {
        expect(
            component.queryTimeCrossSectionByFormationNumber('10702')(),
        ).toBeUndefined();
        expect(component.queryHistoriesByFormationNumber('10702')()).toEqual(
            [],
        );
    });
});
