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
import { BotLootGenerator } from "@spt/generators/BotLootGenerator";

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
    BaseClasses.STIMULATOR
];

class CustomFirstAidKits implements IPostDBLoadMod, IPreSptLoadMod 
{
    private static container: DependencyContainer;
    private originalLootGenerator: BotLootGenerator["generateLoot"];

    public preSptLoad(container: DependencyContainer): void 
    {
        CustomFirstAidKits.container = container;

        container.afterResolution(
            BotLootGenerator,
            (_token, botLootGen: BotLootGenerator) => 
            {
                this.originalLootGenerator = botLootGen.generateLoot;
                botLootGen.generateLoot = this.customGenerateLoot;
            }
        );
    }

    private customGenerateLoot: BotLootGenerator["generateLoot"] = (
        sessionId,
        botJsonTemplate,
        isPmc,
        botRole,
        botInventory,
        botLevel
    ) => 
    {
        this.originalLootGenerator(
            sessionId,
            botJsonTemplate,
            isPmc,
            botRole,
            botInventory,
            botLevel
        );
    }; // ??? should we be looking at addLootFromPool instead? but it's protected https://dev.sp-tarkov.com/SPT/Server/src/branch/3.9.x-DEV/project/src/generators/BotLootGenerator.ts

    public postDBLoad(container: DependencyContainer): void 
    {
        const customItemService =
      container.resolve<CustomItemService>("CustomItemService");
        const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
        const tables = databaseServer.getTables();
        const logger = container.resolve<ILogger>("WinstonLogger");

        // Add custom IFAK
        const customIfak: NewItemFromCloneDetails = {
            itemTplToClone: ItemTpl.CONTAINER_SICC,
            newId: "CustomIFAK",
            parentId: BaseClasses.SIMPLE_CONTAINER,
            overrideProperties: {
                Prefab: {
                    // path: "custom_afak.bundle",
                    path: "assets/content/weapons/usable_items/item_ifak/item_ifak_loot.bundle",
                    rcid: ""
                },
                Grids: [
                    {
                        _name: "main",
                        _id: "CustomIFAKGrid",
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
            "An IFAK pouch that you can fill with your choice of first aid equipment.\nAccepts bandages, tourniquets/CALOK-B, splints, injectors, AI-2, balms, analgin, and emergency water."
                }
            }
        };

        const createdIfak = customItemService.createItemFromClone(customIfak);

        const therapist: ITrader = tables.traders[Traders.THERAPIST];

        // Add to trader stock:

        const emptyIfak = `${createdIfak.itemId}Empty`; // Empty, no bandages inside

        therapist.assort.items.push({
            _id: emptyIfak,
            _tpl: createdIfak.itemId,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: true,
                StackObjectsCount: 999999,
                BuyRestrictionMax: 3,
                BuyRestrictionCurrent: 0
            }
        });

        therapist.assort.barter_scheme[emptyIfak] = [
            [
                {
                    count: 16000,
                    _tpl: Money.ROUBLES
                }
            ]
        ];

        therapist.assort.loyal_level_items[emptyIfak] = 2;

        const filledIfakBuy = `${createdIfak.itemId}Filled`; // Contains bandages

        therapist.assort.items.push(
            {
                _id: filledIfakBuy,
                _tpl: createdIfak.itemId,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    UnlimitedCount: true,
                    StackObjectsCount: 999999,
                    BuyRestrictionMax: 5,
                    BuyRestrictionCurrent: 0
                }
            },
            {
                _id: `${filledIfakBuy}Bandage`,
                _tpl: ItemTpl.MEDICAL_ARMY_BANDAGE,
                parentId: filledIfakBuy,
                slotId: "main"
            },
            {
                _id: `${filledIfakBuy}CAT`,
                _tpl: ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET,
                parentId: filledIfakBuy,
                slotId: "main"
            },
            {
                _id: `${filledIfakBuy}CALOK`,
                _tpl: ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR,
                parentId: filledIfakBuy,
                slotId: "main"
            }
        );

        therapist.assort.barter_scheme[filledIfakBuy] = [
            [
                {
                    count: 50000,
                    _tpl: Money.ROUBLES
                }
            ]
        ];

        therapist.assort.loyal_level_items[filledIfakBuy] = 3;

        const filledIfakBarter = `${createdIfak.itemId}FilledBarter`; // Contains bandages

        therapist.assort.items.push(
            {
                _id: filledIfakBarter,
                _tpl: createdIfak.itemId,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    UnlimitedCount: true,
                    StackObjectsCount: 999999,
                    BuyRestrictionMax: 5,
                    BuyRestrictionCurrent: 0
                }
            },
            {
                _id: `${filledIfakBarter}Bandage`,
                _tpl: ItemTpl.MEDICAL_ARMY_BANDAGE,
                parentId: filledIfakBarter,
                slotId: "main"
            },
            {
                _id: `${filledIfakBarter}CAT`,
                _tpl: ItemTpl.MEDICAL_CAT_HEMOSTATIC_TOURNIQUET,
                parentId: filledIfakBarter,
                slotId: "main"
            },
            {
                _id: `${filledIfakBarter}CALOK`,
                _tpl: ItemTpl.MEDICAL_CALOKB_HEMOSTATIC_APPLICATOR,
                parentId: filledIfakBarter,
                slotId: "main"
            }
        );

        therapist.assort.barter_scheme[filledIfakBarter] = [
            [
                {
                    count: 2,
                    _tpl: ItemTpl.BARTER_BOTTLE_OF_SALINE_SOLUTION
                }
            ]
        ];

        therapist.assort.loyal_level_items[filledIfakBarter] = 2;

        logger.logWithColor(
            "Custom First Aid Kits: Items added!",
            LogTextColor.YELLOW
        );
    }
}

export const mod = new CustomFirstAidKits();
