import { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import type { BotWeaponGenerator } from "@spt/generators/BotWeaponGenerator";
import type { BotGeneratorHelper } from "@spt/helpers/BotGeneratorHelper";
import type { BotHelper } from "@spt/helpers/BotHelper";
import type { HandbookHelper } from "@spt/helpers/HandbookHelper";
import type { InventoryHelper } from "@spt/helpers/InventoryHelper";
import type { ItemHelper } from "@spt/helpers/ItemHelper";
import type { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import type { Inventory } from "@spt/models/eft/common/tables/IBotBase";
import type { IBotType } from "@spt/models/eft/common/tables/IBotType";
import type { Item } from "@spt/models/eft/common/tables/IItem";
import type { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import type { BotLootCacheService } from "@spt/services/BotLootCacheService";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { LocalisationService } from "@spt/services/LocalisationService";
import type { HashUtil } from "@spt/utils/HashUtil";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import itemCfg, { type ItemCfgInfo } from "../db/itemCfg";
import GridHelper from "./GridHelper";
import type Logger from "./Logger";
import type CfakConfig from "./types/CfakConfig";
import { type CustomMedkitItemTpl, type OriginalMedkitItemTpl, customToOriginalMap, isCustomMedkitItemTpl, isOriginalMedkitItemTpl } from "./types/Item";
import { addMedkitLoot, conditionallyAddMedkitLoot } from "./MedkitHelper";

export default class CustomBotLootGenerator extends BotLootGenerator 
{
    private replaceBaseItems: boolean;

    public constructor(
        sptLogger: ILogger, 
        hashUtil: HashUtil, 
        randomUtil: RandomUtil, 
        itemHelper: ItemHelper, 
        inventoryHelper: InventoryHelper, 
        databaseService: DatabaseService, 
        handbookHelper: HandbookHelper, 
        botGeneratorHelper: BotGeneratorHelper, 
        botWeaponGenerator: BotWeaponGenerator, 
        weightedRandomHelper: WeightedRandomHelper, 
        botHelper: BotHelper, 
        botLootCacheService: BotLootCacheService, 
        localisationService: LocalisationService, 
        configServer: ConfigServer, 
        cloner: ICloner, 
        cfakCfg: CfakConfig,
        private myLogger: Logger
    ) 
    {
        super(
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
            cloner
        );
        this.replaceBaseItems = cfakCfg.replaceBaseItems;
    }

    public generateLoot: BotLootGenerator["generateLoot"] = 
        (sessionId: string, botJsonTemplate: IBotType, isPmc: boolean, botRole: string, botInventory: Inventory, botLevel: number) =>
        {
            this.myLogger.debug(`Custom BotLootGenerator.generateLoot() called for ${botRole} - replaceBaseItems = ${this.replaceBaseItems}`, true);
            super.generateLoot(sessionId, botJsonTemplate, isPmc, botRole, botInventory, botLevel);
        }

    /**
     * Some items need child items to function, add them to the itemToAddChildrenTo array
     * @param itemToAddTemplate Db template of item to check
     * @param itemToAddChildrenTo Item to add children to
     * @param isPmc Is the item being generated for a pmc (affects money/ammo stack sizes)
     * @param botRole role bot has that owns item
     */
    protected addRequiredChildItemsToParent(
        itemToAddTemplate: ITemplateItem,
        itemToAddChildrenTo: Item[],
        isPmc: boolean,
        botRole: string
    ): void 
    {
        super.addRequiredChildItemsToParent(itemToAddTemplate, itemToAddChildrenTo, isPmc, botRole);
        
        const itemTpl = itemToAddTemplate._id;
        
        // Fill custom first aid kits - if we replace base items check for original ID, else check for custom ID
        conditionallyAddMedkitLoot(itemTpl, itemToAddChildrenTo, this.replaceBaseItems, this.myLogger, this.hashUtil);
    }
}