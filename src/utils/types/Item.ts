import { ItemTpl } from "@spt/models/enums/ItemTpl";

export type CustomItemTpl = CustomMedkitItemTpl;

export enum CustomMedkitItemTpl 
{
    CAR_FIRST_AID_KIT = "CustomCarAFAK",
    SALEWA_FIRST_AID_KIT = "CustomSalewa",
    IFAK_FIST_AID_KIT = "CustomIFAK",
    AFAK_FIRST_AID_KIT = "CustomAFAK",
    GRIZZLY_FIRST_AID_KIT = "CustomGrizzly"
}

export type OriginalItemTpl = OriginalMedkitItemTpl;

export enum OriginalMedkitItemTpl
{
    CAR_FIRST_AID_KIT = "590c661e86f7741e566b646a",
    SALEWA_FIRST_AID_KIT = "544fb45d4bdc2dee738b4568",
    IFAK_FIST_AID_KIT = "590c678286f77426c9660122",
    AFAK_FIRST_AID_KIT = "60098ad7c2240c0fe85c570a",
    GRIZZLY_FIRST_AID_KIT = "590c657e86f77412b013051d"
}

/** Maps IDs for custom to originals. Aids reverse lookup since itemCfg is indexed by original Id */
export const customToOriginalMap: Record<CustomItemTpl, OriginalItemTpl> = {
    // Medkits
    [CustomMedkitItemTpl.CAR_FIRST_AID_KIT]: OriginalMedkitItemTpl.CAR_FIRST_AID_KIT,
    [CustomMedkitItemTpl.SALEWA_FIRST_AID_KIT]: OriginalMedkitItemTpl.SALEWA_FIRST_AID_KIT,
    [CustomMedkitItemTpl.IFAK_FIST_AID_KIT]: OriginalMedkitItemTpl.IFAK_FIST_AID_KIT,
    [CustomMedkitItemTpl.AFAK_FIRST_AID_KIT]: OriginalMedkitItemTpl.AFAK_FIRST_AID_KIT,
    [CustomMedkitItemTpl.GRIZZLY_FIRST_AID_KIT]: OriginalMedkitItemTpl.GRIZZLY_FIRST_AID_KIT
}