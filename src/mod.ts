import type { DependencyContainer } from "tsyringe";

import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { JsonUtil } from "@spt/utils/JsonUtil";

import * as cfakCfg from "../config/config.json";
import { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import ItemFactory from "./utils/ItemFactory";

class CustomFirstAidKits implements IPostDBLoadMod, IPreSptLoadMod 
{
    private static container: DependencyContainer;
    private static jsonUtil: JsonUtil;
    private originalLootGenerator: BotLootGenerator["generateLoot"];

    public preSptLoad(container: DependencyContainer): void 
    {
        CustomFirstAidKits.container = container;
        CustomFirstAidKits.jsonUtil = container.resolve(JsonUtil);
        

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

        const logger = container.resolve<ILogger>("WinstonLogger");

        logger.logWithColor(
            "Custom First Aid Kits: This mod requires Traders Sell Bundles to function - if you don't have it installed, make sure to install it!",
            LogTextColor.BLACK,
            LogBackgroundColor.YELLOW
        );

        ItemFactory.init(container);
        const itemFactory = new ItemFactory(cfakCfg.replaceBaseItems);
        itemFactory.createItems();
        logger.logWithColor(
            "Custom First Aid Kits: Items added!",
            LogTextColor.YELLOW
        );
        itemFactory.barterChanges();
        logger.logWithColor(
            "Custom First Aid Kits: Trades updated!",
            LogTextColor.YELLOW
        );


        // Add to trader stock:
        /*
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

        
        */
    }
}

export const mod = new CustomFirstAidKits();
