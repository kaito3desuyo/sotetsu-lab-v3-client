import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

export interface OperationRouteDiagramNavigateTimetable {
    tripBlockId: string;
    tripDirection: ETripDirection;
}
