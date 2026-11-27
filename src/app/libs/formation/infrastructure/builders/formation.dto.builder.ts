import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import {
    FormationDetailsDto,
    VehicleFormationDto,
} from '../../usecase/dtos/formation-details.dto';
import {
    FormationModel,
    VehicleFormationModel,
} from '../models/formation.model';

const buildVehicleFormation = ({
    carNumber,
    vehicle,
}: VehicleFormationModel): VehicleFormationDto => ({
    carNumber,
    vehicle: vehicle && {
        vehicleNumber: vehicle.vehicleNumber,
        modifications: vehicle.modifications?.map(
            ({ modifiedOn, kind, value, description }) => ({
                modifiedOn: modifiedOn ?? null,
                kind,
                value: value ?? null,
                description: description ?? null,
            }),
        ),
    },
});

export const FormationDtoBuilder = {
    buildFromModel: ({
        id,
        agency,
        vehicleFormations,
        ...rest
    }: FormationModel): FormationDetailsDto => ({
        ...rest,
        formationId: id,
        agency: agency && AgencyDtoBuilder.buildFromModel(agency),
        vehicleFormations: vehicleFormations?.map(buildVehicleFormation),
    }),
    buildVehicleFormation,
    buildFromModels: (models: FormationModel[]): FormationDetailsDto[] =>
        models.map((model) => FormationDtoBuilder.buildFromModel(model)),
} as const;
