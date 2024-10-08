import type { DependencyContainer } from "tsyringe";

import type { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import { BotWeaponGenerator } from "@spt/generators/BotWeaponGenerator";
import { BotGeneratorHelper } from "@spt/helpers/BotGeneratorHelper";
import { BotHelper } from "@spt/helpers/BotHelper";
import { HandbookHelper } from "@spt/helpers/HandbookHelper";
import { InventoryHelper } from "@spt/helpers/InventoryHelper";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { ConfigServer } from "@spt/servers/ConfigServer";
import { BotLootCacheService } from "@spt/services/BotLootCacheService";
import { DatabaseService } from "@spt/services/DatabaseService";
import { LocalisationService } from "@spt/services/LocalisationService";
import { HashUtil } from "@spt/utils/HashUtil";
import { RandomUtil } from "@spt/utils/RandomUtil";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import * as _cfakCfg from "../config/config.json";
import CustomBotLootGenerator from "./utils/CustomBotLootGenerator";
import ItemFactory from "./utils/ItemFactory";
import Logger, { LoggerLvl } from "./utils/Logger";
import type CfakConfig from "./utils/types/CfakConfig";

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
        
        container.afterResolution<BotLootGenerator>(
            "BotLootGenerator",
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
        const itemFactory = new ItemFactory(this.cfakCfg, this.logger);
        itemFactory.createBloodbag();
        itemFactory.createMedkits();
        this.logger.log("Items added!");
    }
}

export const mod = new CustomFirstAidKits();
