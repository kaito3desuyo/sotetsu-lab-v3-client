import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AgencyDetailsDto } from 'src/app/libs/agency/usecase/dtos/agency-details.dto';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripPositionComponent } from 'src/app/shared/trip-position/trip-position.component';
import { OperationRealTimeOperationCardComponent } from './operation-real-time-operation-card.component';

const sighting = (operationSightingId: string) =>
    ({ operationSightingId }) as OperationSightingDetailsDto;

const open = jest.fn();

describe('OperationRealTimeOperationCardComponent', () => {
    let component: OperationRealTimeOperationCardComponent;
    let fixture: ComponentFixture<OperationRealTimeOperationCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeOperationCardComponent],
            providers: [
                provideRouter([]),
                { provide: OperationPostDialogService, useValue: { open } },
            ],
        })
            // 本物のテンプレートで行の投稿ボタンを確かめる。子の部品（運用番号チップ・
            // 現在位置）は別の spec で見るので外す
            .overrideComponent(OperationRealTimeOperationCardComponent, {
                remove: {
                    imports: [
                        OperationNumberTagComponent,
                        TripPositionComponent,
                    ],
                },
                add: { schemas: [NO_ERRORS_SCHEMA] },
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

    it('編成番号は編成別時刻表へのリンクになる', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            expectedSighting: { formation: { formationNumber: '8713' } },
        } as OperationSightingTimeCrossSectionDto);
        fixture.detectChanges();

        const link = (fixture.nativeElement as HTMLElement).querySelector(
            'a[href="/timetable/formation;formation_number=8713"]',
        );
        expect(link?.textContent?.trim()).toBe('8713');
    });

    it('昨日の目撃の下線は編成番号のリンクで消さない', () => {
        fixture.componentRef.setInput('timeCrossSection', {
            latestSighting: {
                sightingTime: new Date(Date.now() - 86_400_000).toISOString(),
            },
            expectedSighting: { formation: { formationNumber: '8713' } },
        } as OperationSightingTimeCrossSectionDto);
        fixture.detectChanges();

        const link = (fixture.nativeElement as HTMLElement).querySelector(
            'a[href="/timetable/formation;formation_number=8713"]',
        );
        // 下線は親の span が持つ。リンク側は継ぐだけで、自分では下線を足さず消しもしない
        expect(link?.parentElement?.classList).toContain('tw-underline');
        expect(link?.classList).toContain('[text-decoration:inherit]');
        expect(link?.classList).not.toContain('tw-no-underline');
        expect(link?.classList).not.toContain('tw-underline');
    });

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

    it('行の投稿ボタンは、その運用番号を入れて投稿ダイアログを開く', () => {
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[data-testid="row-post"]',
        ) as HTMLButtonElement;
        button.click();
        expect(open).toHaveBeenCalledWith('realtime_operation_card', {
            operationNumber: component.operation().operationNumber,
        });
    });

    describe('読み込み中の「現在位置」の段（届いたときにカードが伸びて下がずれないように）', () => {
        const placeholder = () =>
            (fixture.nativeElement as HTMLElement).querySelector(
                '[aria-label="現在位置を取得中"]',
            );

        it('取得中で現在位置を表示する設定なら、見出しと骨組みを 1 行ぶん描く', () => {
            fixture.componentRef.setInput('isVisibleCurrentPosition', true);
            fixture.componentRef.setInput('isSightingLoading', true);
            fixture.detectChanges();

            expect(placeholder()).not.toBeNull();
            expect(fixture.nativeElement as HTMLElement).toHaveTextContent(
                '現在位置',
            );
        });

        it('現在位置を表示しない設定なら描かない', () => {
            fixture.componentRef.setInput('isVisibleCurrentPosition', false);
            fixture.componentRef.setInput('isSightingLoading', true);
            fixture.detectChanges();

            expect(placeholder()).toBeNull();
        });

        it('取得が済んだら描かない', () => {
            fixture.componentRef.setInput('isVisibleCurrentPosition', true);
            fixture.componentRef.setInput('isSightingLoading', false);
            fixture.detectChanges();

            expect(placeholder()).toBeNull();
        });
    });
});
