import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
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

describe('OperationRealTimeFormationTableComponent', () => {
    let component: OperationRealTimeFormationTableComponent;
    let fixture: ComponentFixture<OperationRealTimeFormationTableComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFormationTableComponent],
            providers: [
                {
                    provide: AgencyListStateQuery,
                    useValue: { agencies$: of([]) },
                },
            ],
        })
            .overrideComponent(OperationRealTimeFormationTableComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.setAgencyOrder([]);
        OperationRealTimeStore.setFormations([
            formation('10701', 'sotetsu'),
            formation('10702', 'sotetsu'),
            formation('5101', 'tokyu'),
        ]);
        OperationRealTimeStore.setFormationSightingTimeCrossSection(
            '10701',
            expecting('12'),
        );
        OperationRealTimeStore.setFormationSightingTimeCrossSection(
            '5101',
            expecting('31K'),
        );
        OperationRealTimeStore.setSelectedAgencyIds([]);
        OperationRealTimeStore.setSelectedGroupNames([]);

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
        OperationRealTimeStore.setSelectedAgencyIds(['sotetsu']);

        expect(numbers()).toEqual(['10701', '10702']);
    });

    it('運用群は、その編成が今入っていると予想される運用の番号で見る', () => {
        OperationRealTimeStore.setSelectedGroupNames(['1群']);

        expect(numbers()).toEqual(['10701']);
    });

    it('現在位置は、予想される運用の現在位置を引く', () => {
        const position = {} as OperationCurrentPositionDto;
        OperationRealTimeStore.setCurrentPosition('12', position);

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
