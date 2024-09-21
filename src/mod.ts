import { DependencyContainer } from "tsyringe";

import { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import { IPostSptLoadMod } from "@spt/models/external/IPostSptLoadMod";
import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { HashUtil } from "@spt/utils/HashUtil";
import { JsonUtil } from "@spt/utils/JsonUtil";
import { DatabaseServer } from "@spt/servers/DatabaseServer";

import * as config from "../config/config.json";
import { CustomItemService } from "@spt/services/mod/CustomItemService";
import { NewItemFromCloneDetails } from "@spt/models/spt/mod/NewItemDetails";
import { ITrader } from "@spt/models/eft/common/tables/ITrader";
import { Money } from "@spt/models/enums/Money";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { Grid } from "@spt/models/eft/common/tables/ITemplateItem";
import { ItemTpl } from "@spt/models/enums/ItemTpl";
import { Traders } from "@spt/models/enums/Traders";

const allowedItems = [
    ItemTpl.MEDICAL_ARMY_BANDAGE,
    ItemTpl.MEDICAL_ASEPTIC_BANDAGE,
    ItemTpl.MEDICAL_ESMARCH_TOURNIQUET,
    ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET,
    ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR,
    ItemTpl.MEDICAL_IMMOBILIZING_SPLINT,
    ItemTpl.MEDICAL_ALUMINUM_SPLINT,
    ItemTpl.DRUGS_ANALGIN_PAINKILLERS,
    ItemTpl.DRUGS_GOLDEN_STAR_BALM,
    ItemTpl.DRUGS_VASELINE_BALM,
    ItemTpl.DRUGS_MORPHINE_INJECTOR,
    ItemTpl.MEDKIT_AI2,
    BaseClasses.STIMULATOR,
];

class Mod implements IPostDBLoadMod {
    public postDBLoad(container: DependencyContainer): void {
        const customItemService =
            container.resolve<CustomItemService>("CustomItemService");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const tables = databaseServer.getTables();
        const logger = container.resolve<ILogger>("WinstonLogger");


        // Add custom IFAK
        const customIfak: NewItemFromCloneDetails = {
            itemTplToClone: "5d235bb686f77443f4331278",
            newId: "CustomIFAK",
            parentId: BaseClasses.SIMPLE_CONTAINER,
            overrideProperties: {
                Prefab: {
                    // path: "custom_afak.bundle",
                    path: "assets/content/weapons/usable_items/item_ifak/item_ifak_loot.bundle",
                    rcid: "",
                },
                Grids: [
                    {
                        _name: "main",
                        _id: "CustomIFAK-grid",
                        _parent: "CustomIFAK",
                        _props: {
                            filters: [
                                {
                                    Filter: allowedItems,
                                    ExcludedFilter: []
                                }
                            ],
                            cellsH: 1,
                            cellsV: 3,
                            minCount: 0,
                            maxCount: 0,
                            isSortingTable: false,
                            maxWeight: 0
                        },
                        _proto: "55d329c24bdc2d892f8b4567"
                    }
                ],
                Width: 1,
                Height: 1,
                ItemSound: "med_medkit",
                Weight: 0.2
            },
            fleaPriceRoubles: 16000,
            handbookParentId: "5b47574386f77428ca22b338",
            handbookPriceRoubles: 16000,
            locales: {
                en: {
                    name: "Custom IFAK",
                    shortName: "C-FAK",
                    description:
                        "An IFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water.",
                },
            },
        };

        const createdIfak = customItemService.createItemFromClone(customIfak);

        const therapist: ITrader = tables.traders[Traders.THERAPIST];

        const emptyIfak = `${createdIfak.itemId}-empty`;

        therapist.assort.items.push({
            _id: emptyIfak,
            _tpl: createdIfak.itemId,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: true,
                StackObjectsCount: 999999, 
                BuyRestrictionMax: 3,
                BuyRestrictionCurrent: 0,
            },
        });

        therapist.assort.barter_scheme[emptyIfak] = [
            [
                {
                    count: 16000,
                    _tpl: Money.ROUBLES,
                },
            ],
        ];

        therapist.assort.loyal_level_items[emptyIfak] = 2;

        const filledIfak = `${createdIfak.itemId}-filled`;

        therapist.assort.items.push({
            _id: filledIfak,
            _tpl: createdIfak.itemId,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: true,
                StackObjectsCount: 999999,
                BuyRestrictionMax: 5,
                BuyRestrictionCurrent: 0,
            }
        },
        {
            _id: `${filledIfak}-bandage`,
            _tpl: ItemTpl.MEDICAL_ARMY_BANDAGE,
            parentId: filledIfak,
            slotId: "main"
        },
        {
            _id: `${filledIfak}-CAT`,
            _tpl: ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET,
            parentId: filledIfak,
            slotId: "main"
        },
        {
            _id: `${filledIfak}-CALOK`,
            _tpl: ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR,
            parentId: filledIfak,
            slotId: "main"
        });

        therapist.assort.barter_scheme[filledIfak] = [
            [
                {
                    count: 50000,
                    _tpl: Money.ROUBLES,
                },
            ],
        ];

        therapist.assort.loyal_level_items[filledIfak] = 3;



        logger.logWithColor("Custom First Aid Kits: Items added!", LogTextColor.YELLOW);
    }

    createGrid(
        container,
        itemId,
        columns: { cellH: number; cellV: number }[]
    ): Grid[] {
        const grids: Grid[] = [];

        for (const [key, val] of Object.entries(columns)) {
            grids.push(
                this.generateColumn(
                    container,
                    itemId,
                    `column_${key}`,
                    val.cellH,
                    val.cellV
                )
            );
        }

        return grids;
    }

    generateColumn(
        container: DependencyContainer,
        itemId,
        name,
        cellH,
        cellV
    ): Grid {
        const hashUtil = container.resolve<HashUtil>("HashUtil");

        return {
            _name: name,
            _id: hashUtil.generate(),
            _parent: itemId,
            _props: {
                filters: [
                    {
                        Filter: allowedItems,
                        ExcludedFilter: [],
                    },
                ],
                cellsH: cellH,
                cellsV: cellV,
                minCount: 0,
                maxCount: 0,
                maxWeight: 0,
                isSortingTable: false,
            },
            _proto: "55d329c24bdc2d892f8b4567",
        };
    }
}

export const mod = new Mod();
