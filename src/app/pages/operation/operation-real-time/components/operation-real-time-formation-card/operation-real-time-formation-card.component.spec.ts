import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationNumberLinkComponent } from 'src/app/shared/operation-number-link/operation-number-link.component';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { OperationRealTimeFormationCardComponent } from './operation-real-time-formation-card.component';

const sighting = (operationSightingId: string) =>
    ({ operationSightingId }) as OperationSightingDetailsDto;

const open = jest.fn();

describe('OperationRealTimeFormationCardComponent', () => {
    let component: OperationRealTimeFormationCardComponent;
    let fixture: ComponentFixture<OperationRealTimeFormationCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeFormationCardComponent],
            providers: [
                { provide: OperationPostDialogService, useValue: { open } },
            ],
        })
            // 本物のテンプレートで行の投稿ボタンを確かめる。子の部品（運用番号チップ・
            // 現在位置）は別の spec で見るので外す
            .overrideComponent(OperationRealTimeFormationCardComponent, {
                remove: {
                    imports: [
                        OperationNumberLinkComponent,
                        TripPositionComponent,
                    ],
                },
                add: { schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(
            OperationRealTimeFormationCardComponent,
        );
        component = fixture.componentInstance;
        fixture.componentRef.setInput('formation', {
            formationNumber: '10701',
            vehicleType: '10000',
            agencyId: 'a-1',
        } as FormationDetailsDto);
    });

    const crossSection = (latestId: string, operationNumber?: string) =>
        ({
            latestSighting: sighting(latestId),
            expectedSighting: operationNumber
                ? { operation: { operationNumber } }
                : undefined,
        }) as OperationSightingTimeCrossSectionDto;

    it('予想運用があれば最新の目撃を履歴から除き、残りが無ければ履歴を出さない', () => {
        fixture.componentRef.setInput(
            'timeCrossSection',
            crossSection('latest', '12'),
        );
        fixture.componentRef.setInput('histories', [sighting('latest')]);
        expect(component.hasVisibleHistories()).toBe(false);

        fixture.componentRef.setInput('histories', [
            sighting('older'),
            sighting('latest'),
        ]);
        expect(component.hasVisibleHistories()).toBe(true);
        expect(
            component.reversedHistories().map((h) => h.operationSightingId),
        ).toEqual(['latest', 'older']);
    });

    it('予想運用が無ければ、最新の目撃も履歴に出す', () => {
        fixture.componentRef.setInput(
            'timeCrossSection',
            crossSection('latest'),
        );
        fixture.componentRef.setInput('histories', [sighting('latest')]);

        expect(component.hasVisibleHistories()).toBe(true);
    });

    it('編成そのものの「形式・所属会社」を付記する', () => {
        fixture.componentRef.setInput('agencies', [
            { agencyId: 'a-1', agencyName: '相鉄' },
        ] as AgencyDetailsDto[]);

        expect(component.formationAnnotation()).toBe('10000・相鉄');
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

    it('行の投稿ボタンは、所属と編成番号を入れて投稿ダイアログを開く', () => {
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="row-post"]',
        ) as HTMLButtonElement;
        button.click();
        expect(open).toHaveBeenCalledWith({
            agencyId: component.formation().agencyId,
            formationOrVehicleNumber: component.formation().formationNumber,
        });
    });
});
