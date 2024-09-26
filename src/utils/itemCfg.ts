import { IBarterScheme } from "@spt/models/eft/common/tables/ITrader";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ItemTpl } from "@spt/models/enums/ItemTpl";

export interface ItemCfgInfo 
{
    idForNewItem: string;
    price: number;
    locale: {
        name: string;
        shortName: string;
        description: string;
    };
    allowedItems: (ItemTpl | BaseClasses)[];
    grids: {
        cellsH: number;
        cellsV: number;
    }[];
    weight: number;
    bundled?: ItemTpl[];
    bundlePrice?: number;
    customBarter?: IBarterScheme[][]
}

export type ItemCfg = Partial<Record<ItemTpl, ItemCfgInfo>>;

const bandages = [
    ItemTpl.MEDICAL_ARMY_BANDAGE,
    ItemTpl.MEDICAL_ASEPTIC_BANDAGE
];

const tourniquets = [
    ItemTpl.MEDICAL_ESMARCH_TOURNIQUET,
    ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET
];

const hemostatic = [
    ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR
];

const splints = [
    ItemTpl.MEDICAL_IMMOBILIZING_SPLINT,
    ItemTpl.MEDICAL_ALUMINUM_SPLINT
];

const misc = [
    ItemTpl.DRUGS_ANALGIN_PAINKILLERS,
    ItemTpl.DRUGS_GOLDEN_STAR_BALM,
    ItemTpl.DRUGS_VASELINE_BALM,
    ItemTpl.DRUGS_MORPHINE_INJECTOR,
    ItemTpl.MEDKIT_AI2,
    ItemTpl.DRINK_EMERGENCY_WATER_RATION,
    BaseClasses.STIMULATOR
];

const allItems = [...bandages, ...tourniquets, ...hemostatic, ...splints, ...misc];

const itemCfg: ItemCfg = {
    [ItemTpl.MEDKIT_IFAK_INDIVIDUAL_FIRST_AID_KIT]: {
        idForNewItem: "CustomIFAK",
        price: 16000,
        grids: [
            { 
                cellsV: 2,
                cellsH: 1
            },
            {
                cellsV: 1,
                cellsH: 1
            }
        ],
        weight: 0.2,
        allowedItems: allItems,
        locale: {
            name: "Custom IFAK",
            shortName: "C-IFAK",
            description:
              "An IFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET],
        bundlePrice: 50000,
        customBarter: [
            [
                {
                    _tpl: ItemTpl.BARTER_BOTTLE_OF_SALINE_SOLUTION,
                    count: 2
                }
            ]
        ]
    },
    [ItemTpl.MEDKIT_AFAK_TACTICAL_INDIVIDUAL_FIRST_AID_KIT]: {
        idForNewItem: "CustomAFAK",
        price: 28000,
        grids: [
            {
                cellsV: 2,
                cellsH: 1
            },
            {
                cellsV: 2,
                cellsH: 1
            }
        ],
        weight: 0.22,
        allowedItems: allItems,
        locale: {
            name: "Custom AFAK",
            shortName: "C-AFAK",
            description:
              "An AFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_IMMOBILIZING_SPLINT, ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET],
        bundlePrice: 80000
    }
}
export default itemCfg;