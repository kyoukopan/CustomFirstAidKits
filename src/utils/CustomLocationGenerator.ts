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
import type { ProbabilityObjectArray, RandomUtil } from "@spt/utils/RandomUtil";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import itemCfg, { type ItemCfgInfo } from "../db/itemCfg";
import GridHelper from "./GridHelper";
import type Logger from "./Logger";
import type CfakConfig from "./types/CfakConfig";
import { type CustomMedkitItemTpl, type OriginalMedkitItemTpl, customToOriginalMap, isCustomMedkitItemTpl, isOriginalMedkitItemTpl } from "./types/Item";
import { LocationGenerator, type IContainerItem } from "@spt/generators/LocationGenerator";
import type { ObjectId } from "@spt/utils/ObjectId";
import type { MathUtil } from "@spt/utils/MathUtil";
import type { SeasonalEventService } from "@spt/services/SeasonalEventService";
import type { ContainerHelper } from "@spt/helpers/ContainerHelper";
import type { PresetHelper } from "@spt/helpers/PresetHelper";
import type { ItemFilterService } from "@spt/services/ItemFilterService";
import type { IStaticAmmoDetails } from "@spt/models/eft/common/ILocation";
import { addMedkitLoot, conditionallyAddMedkitLoot } from "./MedkitHelper";
import type { Spawnpoint } from "@spt/models/eft/common/ILooseLoot";

export default class CustomLocationGenerator extends LocationGenerator
{
    private replaceBaseItems: boolean;
    private hashUtil: HashUtil;

    public constructor(
        sptLogger: ILogger,
        databaseService: DatabaseService,
        objectId: ObjectId,
        randomUtil: RandomUtil,
        itemHelper: ItemHelper,
        mathUtil: MathUtil,
        seasonalEventService: SeasonalEventService,
        containerHelper: ContainerHelper,
        presetHelper: PresetHelper,
        localisationService: LocalisationService,
        itemFilterService: ItemFilterService,
        configServer: ConfigServer,
        cloner: ICloner, 
        cfakCfg: CfakConfig,
        hashUtil: HashUtil,
        private myLogger: Logger
    ) 
    {
        super(
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
            cloner
        );
        this.hashUtil = hashUtil;
        this.replaceBaseItems = cfakCfg.replaceBaseItems;
    }

    /**
     * Creates a static loot item to add to container
     * @returns IContainerItem
     */
    protected createStaticLootItem(chosenTpl: string, staticAmmoDist: Record<string, IStaticAmmoDetails[]>, parentId?: string): IContainerItem 
    {
        // Super call handles most items
        const containerItem: IContainerItem = super.createStaticLootItem(chosenTpl, staticAmmoDist, parentId);
        this.createLootItemPostfix(containerItem);

        return containerItem;
    }

    /**
     * Create array of item (with child items) and return
     * @param chosenComposedKey Key we want to look up items for
     * @param spawnPoint Dynamic spawn point item we want will be placed in
     * @param staticAmmoDist ammo distributions
     * @returns IContainerItem
     */
    protected createDynamicLootItem(chosenComposedKey: string, spawnPoint: Spawnpoint, staticAmmoDist: Record<string, IStaticAmmoDetails[]>): IContainerItem 
    {
        // Super call handles most items
        const containerItem: IContainerItem = super.createDynamicLootItem(chosenComposedKey, spawnPoint, staticAmmoDist);
        this.createLootItemPostfix(containerItem);

        return containerItem;
    }

    /**
     * Addon to createStaticLootItem/createDynamicLootItem. Adds our check for what kind of item the container is and adds medkit item children if detected.
     * @returns Nothing - mutates the original containerItem that is passed in from the original method
     */
    protected createLootItemPostfix(containerItem: IContainerItem): void
    {
        const items = containerItem.items;
        const rootItem = items[0];

        // Fill custom first aid kits - if we replace base items check for original ID, else check for custom ID
        conditionallyAddMedkitLoot(rootItem._tpl, items, this.replaceBaseItems, this.myLogger, this.hashUtil);
    }
}