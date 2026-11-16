export interface AgencyModel {
    id: string;
    agencyNumber: string;
    parentAgencyNumber: string | null;
    agencyOfficialName: string;
    agencyName: string | null;
    agencyType: number;
    agencyUrl: string | null;
    agencyPhone: string | null;
    agencyFareUrl: string | null;
    createdAt: string;
    updatedAt: string;
}
