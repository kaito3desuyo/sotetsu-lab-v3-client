import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { OperationCurrentPositionDto } from 'src/app/libs/operation/usecase/dtos/operation-current-position.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

export interface IOperationRealTimeTableData {
    operation?: OperationDetailsDto;
    formation?: FormationDetailsDto;
    sightingHistories: OperationSightingDetailsDto[];
    timeCrossSection: OperationSightingTimeCrossSectionDto;
    currentPosition: OperationCurrentPositionDto;
}
