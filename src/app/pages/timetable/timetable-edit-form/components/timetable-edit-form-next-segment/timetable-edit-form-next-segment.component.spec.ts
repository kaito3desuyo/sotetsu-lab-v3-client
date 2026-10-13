import '@testing-library/jest-dom';
import { OverlayContainer } from '@angular/cdk/overlay';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { NextSegmentCandidateDto } from 'src/app/libs/operation/usecase/dtos/next-segment-candidate.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import {
    ITimetableEditFormOriginalSegment,
    ITimetableEditFormTrip,
} from '../../interfaces/timetable-edit-form.interface';
import { TimetableEditFormNextSegmentComponent } from './timetable-edit-form-next-segment.component';

const candidate = (
    id: string,
    operationNumber: string,
    startSeconds: number,
    isTaken = false,
    isFixedByTripBlock = false,
): NextSegmentCandidateDto => ({
    tripOperationListId: id,
    tripId: `trip-${id}`,
    operationId: `op-${operationNumber}`,
    operationNumber,
    startStationId: 'ebina',
    startSeconds,
    isTaken,
    isFixedByTripBlock,
});

describe('TimetableEditFormNextSegmentComponent', () => {
    const findManyNextSegmentCandidates = jest.fn();
    let fixture: ComponentFixture<TimetableEditFormNextSegmentComponent>;

    function makeTripForm(
        next: string | null,
        segments: ITimetableEditFormOriginalSegment[] = [
            { id: 'a', operationId: 'op-1', nextTripOperationListId: next },
        ],
    ): ITimetableEditFormTrip {
        return new FormBuilder().group({
            calendarId: ['cal-1'],
            tripOperationLists: [segments],
            nextTripOperationListId: [next],
        }) as unknown as ITimetableEditFormTrip;
    }

    async function render(
        candidates: NextSegmentCandidateDto[],
        next: string | null = null,
        arrivalTime: string | null = '08:00',
    ): Promise<string[]> {
        findManyNextSegmentCandidates.mockReturnValue(of(candidates));
        fixture = TestBed.createComponent(
            TimetableEditFormNextSegmentComponent,
        );
        fixture.componentRef.setInput('tripForm', makeTripForm(next));
        fixture.componentRef.setInput('stationId', 'ebina');
        fixture.componentRef.setInput('arrivalTime', arrivalTime);
        fixture.detectChanges();
        await fixture.whenStable();

        (
            fixture.nativeElement.querySelector(
                '.mat-mdc-select-trigger',
            ) as HTMLElement
        ).click();
        fixture.detectChanges();
        await fixture.whenStable();

        return Array.from(
            TestBed.inject(OverlayContainer)
                .getContainerElement()
                .querySelectorAll('mat-option'),
        ).map((el) => el.textContent.replace(/[ \t\n]+/g, ' ').trim());
    }

    beforeEach(() => {
        findManyNextSegmentCandidates.mockReset();
        TestBed.configureTestingModule({
            imports: [TimetableEditFormNextSegmentComponent],
            providers: [
                {
                    provide: OperationService,
                    useValue: { findManyNextSegmentCandidates },
                },
            ],
        });
    });

    it('候補を時刻順に出し、ほかの区間の次になっているものは添え書きして選べなくする', async () => {
        const options = await render([
            candidate('b', '12K', 30600),
            candidate('c', '38G', 31200, true),
        ]);

        expect(options).toEqual([
            'なし',
            '12K　08:30',
            '38G　08:40（ほかの区間の次）',
        ]);
        const disabled = TestBed.inject(OverlayContainer)
            .getContainerElement()
            .querySelectorAll('mat-option.mdc-list-item--disabled');
        expect(disabled).toHaveLength(1);
    });

    it('終着駅と到着時刻を afterSeconds に換算して引く（4 時前は 2 日目）', async () => {
        await render([], null, '00:10');

        expect(findManyNextSegmentCandidates).toHaveBeenCalledWith({
            calendarId: 'cal-1',
            stationId: 'ebina',
            afterSeconds: 86400 + 600,
        });
    });

    it('到着時刻がまだ無いときは引かない', async () => {
        await render([], null, null);

        expect(findManyNextSegmentCandidates).not.toHaveBeenCalled();
    });

    it('今の値が候補に無いときは「現在の設定」を先頭に残す', async () => {
        const options = await render([candidate('b', '12K', 30600)], 'gone');

        expect(options).toEqual(['なし', '現在の設定', '12K　08:30']);
    });

    it('決まり 1 の行き元がある候補は別の文言で選べない', async () => {
        const options = await render(
            [candidate('b', '12K', 30600, true, true)],
            null,
        );

        expect(options).toEqual(['なし', '12K　08:30（列車の途中でつながる）']);
    });

    it('今の値と同じ候補は isTaken でも選べる', async () => {
        const options = await render([candidate('b', '12K', 30600, true)], 'b');

        expect(options).toEqual(['なし', '12K　08:30']);
    });
});
