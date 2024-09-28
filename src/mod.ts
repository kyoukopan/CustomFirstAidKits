import type { DependencyContainer } from "tsyringe";

import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { LogTextColor } from "@spt/models/spt/logging/LogTextColor";
import { LogBackgroundColor } from "@spt/models/spt/logging/LogBackgroundColor";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { JsonUtil } from "@spt/utils/JsonUtil";

import * as _cfakCfg from "../config/config.json";
import { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import ItemFactory from "./utils/ItemFactory";
import CustomBotLootGenerator from "./utils/CustomBotLootGenerator";
import { HashUtil } from "@spt/utils/HashUtil";
import { RandomUtil } from "@spt/utils/RandomUtil";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { InventoryHelper } from "@spt/helpers/InventoryHelper";
import { DatabaseService } from "@spt/services/DatabaseService";
import { HandbookHelper } from "@spt/helpers/HandbookHelper";
import { BotGeneratorHelper } from "@spt/helpers/BotGeneratorHelper";
import { BotWeaponGenerator } from "@spt/generators/BotWeaponGenerator";
import { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import { BotHelper } from "@spt/helpers/BotHelper";
import { BotLootCacheService } from "@spt/services/BotLootCacheService";
import { LocalisationService } from "@spt/services/LocalisationService";
import { ConfigServer } from "@spt/servers/ConfigServer";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import type CfakConfig from "./utils/types/CfakConfig";
import Logger, { LoggerLvl } from "./utils/Logger";

class CustomFirstAidKits implements IPostDBLoadMod, IPreSptLoadMod 
{
    private logger: Logger;
    private cfakCfg: CfakConfig;
    private replaceBaseItems: boolean;

    public preSptLoad(container: DependencyContainer): void 
    {
        this.cfakCfg = _cfakCfg;
        const sptLogger = container.resolve<ILogger>("WinstonLogger");
        const hashUtil = container.resolve(HashUtil);
        const randomUtil = container.resolve(RandomUtil);
        const itemHelper = container.resolve(ItemHelper);
        const inventoryHelper = container.resolve(InventoryHelper);
        const databaseService = container.resolve(DatabaseService);
        const handbookHelper = container.resolve(HandbookHelper);
        const botGeneratorHelper = container.resolve(BotGeneratorHelper);
        const botWeaponGenerator = container.resolve(BotWeaponGenerator);
        const weightedRandomHelper = container.resolve(WeightedRandomHelper);
        const botHelper = container.resolve(BotHelper);
        const botLootCacheService = container.resolve(BotLootCacheService);
        const localisationService = container.resolve(LocalisationService);
        const configServer = container.resolve(ConfigServer);
        const cloner = container.resolve<ICloner>("PrimaryCloner");
        this.logger = new Logger(this.cfakCfg, sptLogger);
        this.replaceBaseItems = this.cfakCfg.replaceBaseItems;
        
        const customBotLootGenerator = new CustomBotLootGenerator(
            sptLogger,
            hashUtil,
            randomUtil,
            itemHelper,
            inventoryHelper,
            databaseService,
            handbookHelper,
            botGeneratorHelper,
            botWeaponGenerator,
            weightedRandomHelper,
            botHelper,
            botLootCacheService,
            localisationService,
            configServer,
            cloner,
            this.cfakCfg,
            this.logger
        )
        
        container.afterResolution(
            BotLootGenerator,
            (_token, botLootGen: BotLootGenerator) => 
            {
                botLootGen.generateLoot = (...args): void => customBotLootGenerator.generateLoot(...args);
            }, { frequency: "Always" }
        );
        this.logger.log("Updated loot generator to include custom containers!");
    }

    public postDBLoad(container: DependencyContainer): void 
    {

        this.logger.log("This mod requires Traders Sell Bundles to function - if you don't have it installed, make sure to install it!", LoggerLvl.HEADER);
        this.logger.log(`Config set to ${this.replaceBaseItems ? "replace existing items" : "add new items and preserve existing first aid kits"}`);
        if (!this.replaceBaseItems) this.logger.log("If you plan to uninstall this mod or change replaceBaseItems to true, make sure to delete the custom mod items from your profile with Profile Editor!", LoggerLvl.HEADER);

        ItemFactory.init(container);
        const itemFactory = new ItemFactory(this.replaceBaseItems, this.logger);
        itemFactory.createItems();
        this.logger.log("Items added!");
        itemFactory.barterChanges();
        this.logger.log("Trades updated!");


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
