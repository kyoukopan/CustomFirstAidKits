import type { IBarterScheme } from "@spt/models/eft/common/tables/ITrader";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ItemTpl } from "@spt/models/enums/ItemTpl";
import { Money } from "@spt/models/enums/Money";
import { Traders } from "@spt/models/enums/Traders";
import { CustomMedkitItemTpl, CustomNewItemTpl, type OriginalItemTpl } from "./types/Item";
import type { Prefab, Props } from "@spt/models/eft/common/tables/ITemplateItem";

const handbookMedkitsId = "5b47574386f77428ca22b338";

export interface ItemCfgInfo 
{
    itemToCloneTpl: ItemTpl;
    _parent: BaseClasses,
    idForNewItem: string;
    price: number;
    locale: {
        name: string;
        shortName: string;
        description: string;
    };
    allowedItems?: (ItemTpl | BaseClasses)[];
    grids?: {
        cellsH: number;
        cellsV: number;
    }[];
    weight?: number;
    bundled?: ItemTpl[];
    bundlePrice?: number;
    currency: Money;
    customBarter?: IBarterScheme[][];
    soldBy: Traders;
    loyalLevel: {
        buy: number,
        barter?: number,
        empty?: number
    };
    traderSellsEmptyToo?: boolean;
    allowedParentContainers: ItemTpl[];
    prefab: Prefab | "Use Original";
    height?: number;
    width?: number;
    itemSound?: string;
    backgroundColor?: string;
    handbookParent: string;
    otherProps?: Props
}

export type ItemCfg = Record<OriginalItemTpl | CustomNewItemTpl, ItemCfgInfo>;

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

const injectors = [
    BaseClasses.STIMULATOR,
    ItemTpl.DRUGS_MORPHINE_INJECTOR
];

const misc = [
    ItemTpl.DRUGS_ANALGIN_PAINKILLERS,
    ItemTpl.DRUGS_GOLDEN_STAR_BALM,
    ItemTpl.DRUGS_VASELINE_BALM,
    ItemTpl.MEDKIT_AI2,
    ItemTpl.DRINK_EMERGENCY_WATER_RATION
];

const allAllowedMedicalItems = [...bandages, ...tourniquets, ...hemostatic, ...splints, ...injectors, ...misc];

const secureContainers = [ItemTpl.SECURE_CONTAINER_ALPHA, ItemTpl.SECURE_CONTAINER_BETA, ItemTpl.SECURE_CONTAINER_BOSS, ItemTpl.SECURE_CONTAINER_EPSILON, ItemTpl.SECURE_CONTAINER_GAMMA, ItemTpl.SECURE_CONTAINER_GAMMA_TUE, ItemTpl.SECURE_CONTAINER_KAPPA, ItemTpl.SECURE_THETA_SECURE_CONTAINER, ItemTpl.SECURE_WAIST_POUCH, ItemTpl.SECURE_TOURNAMENT_SECURED_CONTAINER]
const medicalContainers = [ItemTpl.CONTAINER_MEDICINE_CASE, ItemTpl.BACKPACK_LBT2670_SLIM_FIELD_MED_PACK_BLACK];

type MedkitInfo = Omit<ItemCfgInfo, "itemToCloneTpl" | "_parent" | "allowedParentContainers" | "prefab" | "handbookParent">;
function createMedkitDetails(info: MedkitInfo): ItemCfgInfo
{
    return {
        itemToCloneTpl: ItemTpl.CONTAINER_SICC,
        _parent: BaseClasses.SIMPLE_CONTAINER,
        allowedParentContainers: [...medicalContainers, ...secureContainers],
        prefab: "Use Original",
        handbookParent: handbookMedkitsId,
        ...info
    }
}

const itemCfg: ItemCfg = {
    [ItemTpl.MEDKIT_CAR_FIRST_AID_KIT]: createMedkitDetails({
        idForNewItem: CustomMedkitItemTpl.CAR_FIRST_AID_KIT,
        price: 4000,
        grids: [
            { 
                cellsV: 1,
                cellsH: 2
            },
            {
                cellsV: 1,
                cellsH: 2
            }
        ],
        weight: 0.12,
        allowedItems: [...bandages, ...misc],
        locale: {
            name: "Custom Car First Aid Kit",
            shortName: "C-CAR",
            description:
              "An IFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ASEPTIC_BANDAGE, ItemTpl.MEDICAL_ASEPTIC_BANDAGE, ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_ARMY_BANDAGE],
        bundlePrice: 14269,
        currency: Money.ROUBLES,
        soldBy: Traders.THERAPIST,
        loyalLevel: {
            buy: 1
        }
    }),
    [ItemTpl.MEDKIT_SALEWA_FIRST_AID_KIT]: createMedkitDetails({
        idForNewItem: CustomMedkitItemTpl.SALEWA_FIRST_AID_KIT,
        price: 20000,
        grids: [
            { 
                cellsV: 2,
                cellsH: 1
            },
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
        allowedItems: allAllowedMedicalItems,
        locale: {
            name: "Custom Salewa",
            shortName: "C-Salewa",
            description:
              "A Salewa first aid kit that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_ASEPTIC_BANDAGE, ItemTpl.MEDICAL_ESMARCH_TOURNIQUET, ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, ItemTpl.DRINK_EMERGENCY_WATER_RATION],
        bundlePrice: 39420,
        currency: Money.ROUBLES,
        // customBarter: [
        //     [
        //         {
        //             _tpl: ItemTpl.BARTER_BOTTLE_OF_SALINE_SOLUTION,
        //             count: 2
        //         }
        //     ]
        // ],
        soldBy: Traders.THERAPIST,
        loyalLevel: {
            buy: 2
            // barter: 2
        }
    }),
    [ItemTpl.MEDKIT_IFAK_INDIVIDUAL_FIRST_AID_KIT]: createMedkitDetails({
        idForNewItem: CustomMedkitItemTpl.IFAK_FIST_AID_KIT,
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
        allowedItems: allAllowedMedicalItems,
        locale: {
            name: "Custom IFAK",
            shortName: "C-IFAK",
            description:
              "An IFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET],
        bundlePrice: 50000,
        currency: Money.ROUBLES,
        customBarter: [
            [
                {
                    _tpl: ItemTpl.BARTER_BOTTLE_OF_SALINE_SOLUTION,
                    count: 2
                }
            ]
        ],
        soldBy: Traders.THERAPIST,
        loyalLevel: {
            buy: 3,
            barter: 2,
            empty: 1
        },
        traderSellsEmptyToo: true
    }),
    [ItemTpl.MEDKIT_AFAK_TACTICAL_INDIVIDUAL_FIRST_AID_KIT]: createMedkitDetails({
        idForNewItem: CustomMedkitItemTpl.AFAK_FIRST_AID_KIT,
        price: 169,
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
        allowedItems: allAllowedMedicalItems,
        locale: {
            name: "Custom AFAK",
            shortName: "C-AFAK",
            description:
              "An AFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [ItemTpl.MEDICAL_ARMY_BANDAGE, ItemTpl.MEDICAL_IMMOBILIZING_SPLINT, ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET],
        bundlePrice: 549,
        currency: Money.DOLLARS,
        soldBy: Traders.PEACEKEEPER,
        loyalLevel: {
            buy: 4,
            barter: 2,
            empty: 2
        },
        traderSellsEmptyToo: true
    }),
    [ItemTpl.MEDKIT_GRIZZLY_MEDICAL_KIT]: createMedkitDetails({
        idForNewItem: CustomMedkitItemTpl.GRIZZLY_FIRST_AID_KIT,
        price: 29000,
        grids: [
            {
                cellsV: 2,
                cellsH: 2
            },
            {
                cellsV: 2,
                cellsH: 2
            }
        ],
        weight: 0.4,
        allowedItems: allAllowedMedicalItems,
        locale: {
            name: "Custom Grizzly Medical Kit",
            shortName: "C-GRIZZLY",
            description:
              "A Grizzly bag that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."

        },
        bundled: [
            ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET,
            ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, 
            ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET, 
            ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR, 
            ItemTpl.MEDICAL_ARMY_BANDAGE,
            ItemTpl.MEDICAL_ASEPTIC_BANDAGE,
            ItemTpl.MEDICAL_ASEPTIC_BANDAGE,
            ItemTpl.MEDICAL_ALUMINUM_SPLINT
        ],
        bundlePrice: 80420,
        currency: Money.ROUBLES,
        soldBy: Traders.THERAPIST,
        loyalLevel: {
            buy: 4
        }
    }),
    [CustomNewItemTpl.WHOLE_BLOOD]: {
        itemToCloneTpl: ItemTpl.MEDKIT_CAR_FIRST_AID_KIT,
        _parent: BaseClasses.MEDICAL,
        idForNewItem: CustomNewItemTpl.WHOLE_BLOOD,
        price: 12000,
        currency: Money.ROUBLES,
        weight: 0.57,
        locale: {
            name: "Whole Blood",
            shortName: "WB",
            description: "Whole blood for transfusion. Used for resuscitation in cases of traumatic blood loss."
        },
        loyalLevel: {
            buy: 1
        },
        handbookParent: "5b47574386f77428ca22b2f3",
        prefab: {
            path: "bloodbag.bundle",
            rcid: ""
        },
        width: 1,
        height: 2,
        itemSound: "food_bottle",
        backgroundColor: "orange",
        allowedParentContainers: [...medicalContainers, ...secureContainers],
        soldBy: Traders.THERAPIST,
        otherProps: {
            effects_damage: {},
            effects_health: {},
            medUseTime: 6,
            MaxHpResource: 6,
            hpResourceRate: 1,
            CanSellOnRagfair: false,
            CanRequireOnRagfair: false
        }
    }
    
}
export default itemCfg;