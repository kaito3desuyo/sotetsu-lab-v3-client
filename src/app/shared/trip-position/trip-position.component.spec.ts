import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { TripPosition, TripPositionComponent } from './trip-position.component';

const stations = [
    { stationId: 's-yokohama', stationName: '横浜' },
    { stationId: 's-ebina', stationName: '海老名' },
] as StationDetailsDto[];

const tripClasses = [
    {
        tripClassId: 'tc-rapid',
        tripClassName: '快速',
        tripClassColor: '#0000ff',
    },
] as TripClassDetailsDto[];

function tol(params: {
    from: string;
    fromTime: string;
    to: string;
    toTime: string;
    depotIn?: boolean;
    depotOut?: boolean;
}): TripOperationListDetailsDto {
    return {
        tripOperationListId: 'tol',
        trip: {
            tripNumber: '2021',
            tripClassId: 'tc-rapid',
            tripDirection: 0,
            tripBlockId: 'tb',
            depotIn: params.depotIn ?? false,
            depotOut: params.depotOut ?? false,
        },
        startTime: { stationId: params.from, departureTime: params.fromTime },
        endTime: { stationId: params.to, arrivalTime: params.toTime },
    } as TripOperationListDetailsDto;
}

describe('TripPositionComponent', () => {
    let fixture: ComponentFixture<TripPositionComponent>;

    function render(position: TripPosition): string {
        fixture.componentRef.setInput('position', position);
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).textContent
            ?.replace(/arrow_forward/g, '→')
            .replace(/\s+/g, ' ')
            .trim() as string;
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TripPositionComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(TripPositionComponent);
        fixture.componentRef.setInput('stations', stations);
        fixture.componentRef.setInput('tripClasses', tripClasses);
    });

    it('走行中は種別・列番と発着を出す', () => {
        const text = render({
            current: tol({
                from: 's-yokohama',
                fromTime: '11:17:00',
                to: 's-ebina',
                toTime: '11:53:00',
            }),
        });

        expect(text).toBe('快速 2021 横浜 11:17 → 海老名 11:53');
    });

    it('出庫前は「出庫前○」から次列車の始発駅へ', () => {
        const text = render({
            next: tol({
                from: 's-ebina',
                fromTime: '18:16:00',
                to: 's-yokohama',
                toTime: '18:50:00',
                depotOut: true,
            }),
        });

        expect(text).toBe('出庫前○ → 海老名 18:16');
    });

    it('同じ駅で折り返す間隙は「停車中」', () => {
        const text = render({
            prev: tol({
                from: 's-ebina',
                fromTime: '10:40:00',
                to: 's-yokohama',
                toTime: '11:20:00',
            }),
            next: tol({
                from: 's-yokohama',
                fromTime: '11:28:00',
                to: 's-ebina',
                toTime: '12:00:00',
            }),
        });

        expect(text).toBe('横浜 11:20 → 停車中 11:28');
    });

    it('入庫を挟む間隙は「一時入庫」', () => {
        const text = render({
            prev: tol({
                from: 's-yokohama',
                fromTime: '09:00:00',
                to: 's-ebina',
                toTime: '09:33:00',
                depotIn: true,
            }),
            next: tol({
                from: 's-ebina',
                fromTime: '16:16:00',
                to: 's-yokohama',
                toTime: '16:50:00',
            }),
        });

        expect(text).toBe('海老名 09:33 → 一時入庫 16:16');
    });

    it('最終列車の後は「入庫済△」', () => {
        const text = render({
            prev: tol({
                from: 's-yokohama',
                fromTime: '07:50:00',
                to: 's-ebina',
                toTime: '08:23:00',
                depotIn: true,
            }),
        });

        expect(text).toBe('海老名 08:23 → 入庫済△');
    });
});
