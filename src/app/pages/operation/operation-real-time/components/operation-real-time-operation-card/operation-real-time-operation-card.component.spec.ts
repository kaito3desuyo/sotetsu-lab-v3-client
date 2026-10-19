import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationRealTimeOperationCardComponent } from './operation-real-time-operation-card.component';

const sighting = (operationSightingId: string) =>
    ({ operationSightingId }) as OperationSightingDetailsDto;

describe('OperationRealTimeOperationCardComponent', () => {
    let component: OperationRealTimeOperationCardComponent;
    let fixture: ComponentFixture<OperationRealTimeOperationCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeOperationCardComponent],
        })
            .overrideComponent(OperationRealTimeOperationCardComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(
            OperationRealTimeOperationCardComponent,
        );
        component = fixture.componentInstance;
        fixture.componentRef.setInput('operation', {
            operationNumber: '12',
        } as OperationDetailsDto);
    });

    const crossSection = (latestId: string, formationId?: string) =>
        ({
            latestSighting: sighting(latestId),
            expectedSighting: formationId
                ? { formation: { formationId } }
                : undefined,
        }) as OperationSightingTimeCrossSectionDto;

    it('履歴は新しい順に並べる', () => {
        fixture.componentRef.setInput('histories', [
            sighting('old'),
            sighting('new'),
        ]);

        expect(
            component.reversedHistories().map((h) => h.operationSightingId),
        ).toEqual(['new', 'old']);
    });

    it('予想編成があれば最新の目撃を履歴から除き、残りが無ければ履歴を出さない', () => {
        fixture.componentRef.setInput(
            'timeCrossSection',
            crossSection('latest', 'f-1'),
        );
        fixture.componentRef.setInput('histories', [sighting('latest')]);
        expect(component.hasVisibleHistories()).toBe(false);

        fixture.componentRef.setInput('histories', [
            sighting('older'),
            sighting('latest'),
        ]);
        expect(component.hasVisibleHistories()).toBe(true);
    });

    it('予想編成が無ければ、最新の目撃も履歴に出す', () => {
        fixture.componentRef.setInput(
            'timeCrossSection',
            crossSection('latest'),
        );
        fixture.componentRef.setInput('histories', [sighting('latest')]);

        expect(component.hasVisibleHistories()).toBe(true);
    });

    it('予想編成の「形式・所属会社」を付記する', () => {
        fixture.componentRef.setInput(
            'timeCrossSection',
            crossSection('latest', 'f-1'),
        );
        fixture.componentRef.setInput('formations', [
            { formationId: 'f-1', vehicleType: '10000', agencyId: 'a-1' },
        ] as FormationDetailsDto[]);
        fixture.componentRef.setInput('agencies', [
            { agencyId: 'a-1', agencyName: '相鉄' },
        ] as AgencyDetailsDto[]);

        expect(component.formationAnnotation()).toBe('10000・相鉄');
    });

    it('予想編成が無ければ付記しない', () => {
        expect(component.formationAnnotation()).toBe('');
    });

    it('車両のつながりから推測した割り当て（sightedAsOperation あり）なら推測扱い', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            latestSighting: sighting('s1'),
            expectedSighting: {},
            sightedAsOperation: {
                operationId: 'op-11K',
                operationNumber: '11K',
            },
        } as OperationSightingTimeCrossSectionDto);

        expect(component.isInferred()).toBe(true);
    });

    it('実目撃（sightedAsOperation なし）なら推測扱いにしない', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            latestSighting: sighting('s1'),
            expectedSighting: {},
            sightedAsOperation: null,
        } as OperationSightingTimeCrossSectionDto);

        expect(component.isInferred()).toBe(false);
    });
});
