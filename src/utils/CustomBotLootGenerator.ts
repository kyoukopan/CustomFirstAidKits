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
import { CustomMedkitItemTpl, OriginalMedkitItemTpl, customToOriginalMap } from "./types/Item";

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
        if (this.replaceBaseItems ? this.isOriginalMedkitItemTpl(itemTpl) : this.isCustomMedkitItemTpl(itemTpl)) 
        {
            // If replace, itemTpl is OriginalMedkitItemTl, if not, itemTpl is CustomMedkitItemTpl
            const items = this.addMedkitLoot(itemToAddChildrenTo[0]._id, itemTpl as OriginalMedkitItemTpl | CustomMedkitItemTpl);
            itemToAddChildrenTo.push(...items);
            this.myLogger.debug(`itemToAddChildrenTo after pushing stuff ${JSON.stringify(itemToAddChildrenTo, null, 4)}`);
        }
    }

    private isCustomMedkitItemTpl(str: string): str is CustomMedkitItemTpl 
    {
        return Object.values(CustomMedkitItemTpl).includes(str as CustomMedkitItemTpl);
    }

    private isOriginalMedkitItemTpl(str: string): str is OriginalMedkitItemTpl 
    {
        return Object.values(OriginalMedkitItemTpl).includes(str as OriginalMedkitItemTpl);
    }

    /**
     * Based on {@link BotLootGenerator.createWalletLoot}
     */
    private addMedkitLoot(medkitId: string, itemTpl: CustomMedkitItemTpl | OriginalMedkitItemTpl): Item[]
    {
        const result: Item[] = [];
        const medkitDetails: ItemCfgInfo = this.replaceBaseItems ? itemCfg[itemTpl] : itemCfg[customToOriginalMap[itemTpl]]; // If not replaceBaseItems, itemTpl passed in is the custom ID which we must reverse lookup since itemCfg is indexed by original Tpl id
        const gridHelper = new GridHelper(medkitDetails, this.hashUtil, this.myLogger);
        this.myLogger.debug(`Adding medkit loot to ${medkitDetails.idForNewItem}`);
        const succ = gridHelper.addItemsToGridSlots(medkitId, result);
        this.myLogger.debug(`Item array after adding stuffs: ${JSON.stringify(result, null, 4)}`);
        if (!succ) 
        {
            this.myLogger.error(`Unable to add medkit loot to ${itemTpl} (${medkitDetails.idForNewItem})`);
            return [];
        }

        return result;
    }
}