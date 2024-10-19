import type { DependencyContainer } from "tsyringe";

import type { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import type { BotWeaponGenerator } from "@spt/generators/BotWeaponGenerator";
import type { BotGeneratorHelper } from "@spt/helpers/BotGeneratorHelper";
import type { BotHelper } from "@spt/helpers/BotHelper";
import type { HandbookHelper } from "@spt/helpers/HandbookHelper";
import type { InventoryHelper } from "@spt/helpers/InventoryHelper";
import type { ItemHelper } from "@spt/helpers/ItemHelper";
import type { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import type { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import type { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import type { IPreSptLoadMod } from "@spt/models/external/IPreSptLoadMod";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import type { BotLootCacheService } from "@spt/services/BotLootCacheService";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { LocalisationService } from "@spt/services/LocalisationService";
import type { HashUtil } from "@spt/utils/HashUtil";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import * as _cfakCfg from "../config/config.json"; // eslint-disable-line @typescript-eslint/naming-convention
import CustomBotLootGenerator from "./utils/CustomBotLootGenerator";
import ItemFactory from "./utils/ItemFactory";
import Logger, { LoggerLvl } from "./utils/Logger";
import type CfakConfig from "./utils/types/CfakConfig";
import { ModNames, type ModFlags } from "./utils/types/AppTypes";
import type { LocationGenerator } from "@spt/generators/LocationGenerator";
import CustomLocationGenerator from "./utils/CustomLocationGenerator";
import type { ObjectId } from "@spt/utils/ObjectId";
import type { MathUtil } from "@spt/utils/MathUtil";
import type { SeasonalEventService } from "@spt/services/SeasonalEventService";
import type { ContainerHelper } from "@spt/helpers/ContainerHelper";
import type { PresetHelper } from "@spt/helpers/PresetHelper";
import type { ItemFilterService } from "@spt/services/ItemFilterService";

class CustomFirstAidKits implements IPostDBLoadMod, IPreSptLoadMod 
{
    private logger: Logger;
    private cfakCfg: CfakConfig;
    private replaceBaseItems: boolean;
    private modFlags: ModFlags = new Set<string>();

    public preSptLoad(container: DependencyContainer): void 
    {
        this.cfakCfg = _cfakCfg;
        const sptLogger = container.resolve<ILogger>("WinstonLogger");
        const hashUtil = container.resolve<HashUtil>("HashUtil");
        const randomUtil = container.resolve<RandomUtil>("RandomUtil");
        const itemHelper = container.resolve<ItemHelper>("ItemHelper");
        const inventoryHelper = container.resolve<InventoryHelper>("InventoryHelper");
        const databaseService = container.resolve<DatabaseService>("DatabaseService");
        const handbookHelper = container.resolve<HandbookHelper>("HandbookHelper");
        const botGeneratorHelper = container.resolve<BotGeneratorHelper>("BotGeneratorHelper");
        const botWeaponGenerator = container.resolve<BotWeaponGenerator>("BotWeaponGenerator");
        const weightedRandomHelper = container.resolve<WeightedRandomHelper>("WeightedRandomHelper");
        const botHelper = container.resolve<BotHelper>("BotHelper");
        const botLootCacheService = container.resolve<BotLootCacheService>("BotLootCacheService");
        const localisationService = container.resolve<LocalisationService>("LocalisationService");
        const configServer = container.resolve<ConfigServer>("ConfigServer");
        const cloner = container.resolve<ICloner>("PrimaryCloner");
        const preSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");
        const objectId = container.resolve<ObjectId>("objectId");
        const mathUtil = container.resolve<MathUtil>("mathUtil");
        const seasonalEventService = container.resolve<SeasonalEventService>("seasonalEventService");
        const containerHelper = container.resolve<ContainerHelper>("containerHelper");
        const presetHelper = container.resolve<PresetHelper>("presetHelper");
        const itemFilterService = container.resolve<ItemFilterService>("itemFilterService");
        this.logger = new Logger(this.cfakCfg, sptLogger);
        this.replaceBaseItems = this.cfakCfg.replaceBaseItems;

        this.setModFlags(preSptModLoader);

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

        const customLocationGenerator = new CustomLocationGenerator(
            sptLogger,
            databaseService,
            objectId,
            randomUtil,
            itemHelper,
            mathUtil,
            seasonalEventService,
            containerHelper,
            presetHelper,
            localisationService,
            itemFilterService,
            configServer,
            cloner,
            this.cfakCfg,
            hashUtil,
            this.logger
        )
            
        // Extend loot generator to make bots spawn with items in medkits
        // Note we don't add the new medkits to the loot pool, so if replaceBaseItems is false, the new medkits won't spawn (unless something else adds the items in loot pool)
        // With replaceBaseItems = true, the medkits use the original IDs so will spawn on bots
        container.afterResolution<BotLootGenerator>(
            "BotLootGenerator",
            (_token, botLootGen: BotLootGenerator) => 
            {
                botLootGen.generateLoot = (...args): void => customBotLootGenerator.generateLoot(...args);
            }, { frequency: "Always" }
        );
        container.afterResolution<LocationGenerator>(
            "LocationGenerator",
            (_token, locationGenerator: LocationGenerator) => 
            {
                locationGenerator.generateStaticContainers = (...args) => customLocationGenerator.generateStaticContainers(...args);
                locationGenerator.generateDynamicLoot = (...args) => customLocationGenerator.generateDynamicLoot(...args);
            }, { frequency: "Always" }
        );
        this.logger.log("Updated loot generators to fill custom containers!");
        
    }

    public postDBLoad(container: DependencyContainer): void 
    {
        this.logger.log("This mod requires Traders Sell Bundles to function - if you don't have it installed, make sure to install it!", LoggerLvl.HEADER);
        this.logger.log(`Config set to ${this.replaceBaseItems ? "replace existing items" : "add new items and preserve existing first aid kits"}`);
        if (!this.replaceBaseItems) this.logger.log("If you plan to uninstall this mod or change replaceBaseItems to true, make sure to delete the custom mod items from your profile with Profile Editor!", LoggerLvl.HEADER);

        ItemFactory.init(container);
        const itemFactory = new ItemFactory(this.cfakCfg, this.logger, this.modFlags);

        itemFactory.createBloodbag();
        itemFactory.createMedkits();
        this.logger.log("Finished initializing!");
    }

    // Get mods we need to run compatibility stuff for
    private setModFlags(preSptModLoader: PreSptModLoader)
    {
        const modsToFlag = [ModNames.SPT_REALISM];
        const mods = preSptModLoader.getImportedModsNames();
        for (const modName of mods)
        {
            if (modsToFlag.includes(modName as ModNames))
            {
                this.logger.log(`${modName} detected...`);
                this.modFlags.add(modName);
            }
        }
    }
}

export const mod = new CustomFirstAidKits();
