import { BotLootGenerator } from "@spt/generators/BotLootGenerator";
import type { Inventory } from "@spt/models/eft/common/tables/IBotBase";
import type { IBotType } from "@spt/models/eft/common/tables/IBotType";
import type { Item } from "@spt/models/eft/common/tables/IItem";
import type { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { CustomMedkitItemTpl, customToOriginalMap, OriginalMedkitItemTpl } from "./types/Item";
import type { BotLootCacheService } from "@spt/services/BotLootCacheService";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import type { HashUtil } from "@spt/utils/HashUtil";
import type { RandomUtil } from "@spt/utils/RandomUtil";
import type { ItemHelper } from "@spt/helpers/ItemHelper";
import type { InventoryHelper } from "@spt/helpers/InventoryHelper";
import type { DatabaseService } from "@spt/services/DatabaseService";
import type { HandbookHelper } from "@spt/helpers/HandbookHelper";
import type { BotGeneratorHelper } from "@spt/helpers/BotGeneratorHelper";
import type { BotWeaponGenerator } from "@spt/generators/BotWeaponGenerator";
import type { WeightedRandomHelper } from "@spt/helpers/WeightedRandomHelper";
import type { BotHelper } from "@spt/helpers/BotHelper";
import type { LocalisationService } from "@spt/services/LocalisationService";
import type { ConfigServer } from "@spt/servers/ConfigServer";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import type CfakConfig from "./types/CfakConfig";
import itemCfg, { type ItemCfgInfo } from "./itemCfg";
import GridHelper from "./GridHelper";
import type Logger from "./Logger";
import { LootCacheType } from "@spt/models/spt/bots/IBotLootCache";
import { EquipmentSlots } from "@spt/models/enums/EquipmentSlots";
import { ItemAddedResult } from "@spt/models/enums/ItemAddedResult";

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
            // super.generateLoot(sessionId, botJsonTemplate, isPmc, botRole, botInventory, botLevel);
            // Limits on item types to be added as loot
            const itemCounts = botJsonTemplate.generation.items;

            if (
                !itemCounts.backpackLoot.weights ||
            !itemCounts.pocketLoot.weights ||
            !itemCounts.vestLoot.weights ||
            !itemCounts.specialItems.weights ||
            !itemCounts.healing.weights ||
            !itemCounts.drugs.weights ||
            !itemCounts.food.weights ||
            !itemCounts.drink.weights ||
            !itemCounts.currency.weights ||
            !itemCounts.stims.weights ||
            !itemCounts.grenades.weights
            ) 
            {
                this.myLogger.error(this.localisationService.getText("bot-unable_to_generate_bot_loot", botRole));

                return;
            }

            let backpackLootCount = Number(
                this.weightedRandomHelper.getWeightedValue<number>(itemCounts.backpackLoot.weights)
            );
            let pocketLootCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.pocketLoot.weights));
            let vestLootCount = this.weightedRandomHelper.getWeightedValue<number>(itemCounts.vestLoot.weights);
            const specialLootItemCount = Number(
                this.weightedRandomHelper.getWeightedValue<number>(itemCounts.specialItems.weights)
            );
            const healingItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.healing.weights));
            const drugItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.drugs.weights));

            const foodItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.food.weights));
            const drinkItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.drink.weights));

            let currencyItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.currency.weights));

            const stimItemCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.stims.weights));
            const grenadeCount = Number(this.weightedRandomHelper.getWeightedValue<number>(itemCounts.grenades.weights));

            // If bot has been flagged as not having loot, set below counts to 0
            if (this.botConfig.disableLootOnBotTypes?.includes(botRole.toLowerCase())) 
            {
                backpackLootCount = 0;
                pocketLootCount = 0;
                vestLootCount = 0;
                currencyItemCount = 0;
            }

            // Forced pmc healing loot into secure container
            if (isPmc && this.pmcConfig.forceHealingItemsIntoSecure) 
            {
                this.addForcedMedicalItemsToPmcSecure(botInventory, botRole);
            }

            const botItemLimits = this.getItemSpawnLimitsForBot(botRole);

            const containersBotHasAvailable = this.getAvailableContainersBotCanStoreItemsIn(botInventory);

            // This set is passed as a reference to fill up the containers that are already full, this aliviates
            // generation of the bots by avoiding checking the slots of containers we already know are full
            const containersIdFull = new Set<string>();

            // Special items
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.SPECIAL, botJsonTemplate),
                containersBotHasAvailable,
                specialLootItemCount,
                botInventory,
                botRole,
                botItemLimits,
                undefined,
                undefined,
                containersIdFull
            );
            this.myLogger.debug("HEALING ITEM TIME");

            // Healing items / Meds
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.HEALING_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                healingItemCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Drugs
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.DRUG_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                drugItemCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Food
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.FOOD_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                foodItemCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Drink
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.DRINK_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                drinkItemCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Currency
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.CURRENCY_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                currencyItemCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Stims
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.STIM_ITEMS, botJsonTemplate),
                containersBotHasAvailable,
                stimItemCount,
                botInventory,
                botRole,
                botItemLimits,
                0,
                isPmc,
                containersIdFull
            );

            // Grenades
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.GRENADE_ITEMS, botJsonTemplate),
                [EquipmentSlots.POCKETS, EquipmentSlots.TACTICAL_VEST], // Can't use containersBotHasEquipped as we dont want grenades added to backpack
                grenadeCount,
                botInventory,
                botRole,
                undefined,
                0,
                isPmc,
                containersIdFull
            );

            // Backpack - generate loot if they have one
            if (containersBotHasAvailable.includes(EquipmentSlots.BACKPACK)) 
            {
            // Add randomly generated weapon to PMC backpacks
                if (isPmc && this.randomUtil.getChance100(this.pmcConfig.looseWeaponInBackpackChancePercent)) 
                {
                    this.addLooseWeaponsToInventorySlot(
                        sessionId,
                        botInventory,
                        EquipmentSlots.BACKPACK,
                        botJsonTemplate.inventory,
                        botJsonTemplate.chances.weaponMods,
                        botRole,
                        isPmc,
                        botLevel,
                        containersIdFull
                    );
                }

                this.addLootFromPool(
                    this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.BACKPACK, botJsonTemplate),
                    [EquipmentSlots.BACKPACK],
                    backpackLootCount,
                    botInventory,
                    botRole,
                    botItemLimits,
                    this.pmcConfig.maxBackpackLootTotalRub,
                    isPmc,
                    containersIdFull
                );
            }

            // TacticalVest - generate loot if they have one
            if (containersBotHasAvailable.includes(EquipmentSlots.TACTICAL_VEST)) 
            {
            // Vest
                this.addLootFromPool(
                    this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.VEST, botJsonTemplate),
                    [EquipmentSlots.TACTICAL_VEST],
                    vestLootCount,
                    botInventory,
                    botRole,
                    botItemLimits,
                    this.pmcConfig.maxVestLootTotalRub,
                    isPmc,
                    containersIdFull
                );
            }

            // Pockets
            this.addLootFromPool(
                this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.POCKET, botJsonTemplate),
                [EquipmentSlots.POCKETS],
                pocketLootCount,
                botInventory,
                botRole,
                botItemLimits,
                this.pmcConfig.maxPocketLootTotalRub,
                isPmc,
                containersIdFull
            );

            // Secure

            // only add if not a pmc or is pmc and flag is true
            if (!isPmc || (isPmc && this.pmcConfig.addSecureContainerLootFromBotConfig)) 
            {
                this.addLootFromPool(
                    this.botLootCacheService.getLootFromCache(botRole, isPmc, LootCacheType.SECURE, botJsonTemplate),
                    [EquipmentSlots.SECURED_CONTAINER],
                    50,
                    botInventory,
                    botRole,
                    undefined,
                    -1,
                    isPmc,
                    containersIdFull
                );
            }
        }

    protected addLootFromPool(
        pool: Record<string, number>,
        equipmentSlots: string[],
        totalItemCount: number,
        inventoryToAddItemsTo: PmcInventory,
        botRole: string,
        itemSpawnLimits?: IItemSpawnLimitSettings,
        totalValueLimitRub = 0,
        isPmc = false,
        containersIdFull = new Set<string>()
    ): void 
    {
        this.myLogger.debug("ADD LOOT FROM POOL");

        // Loot pool has items
        const poolSize = Object.keys(pool).length;
        if (poolSize > 0) 
        {
            let currentTotalRub = 0;
    
            let fitItemIntoContainerAttempts = 0;
            for (let i = 0; i < totalItemCount; i++) 
            {
                // Pool can become empty if item spawn limits keep removing items
                if (Object.keys(pool).length === 0) 
                {
                    return;
                }
    
                const weightedItemTpl = this.weightedRandomHelper.getWeightedValue<string>(pool);
                const itemResult = this.itemHelper.getItem(weightedItemTpl);
                const itemToAddTemplate = itemResult[1];
                if (!itemResult[0]) 
                {
                    this.myLogger.error(
                        `Unable to process item tpl: ${weightedItemTpl} for slots: ${equipmentSlots} on bot: ${botRole}`
                    );
    
                    continue;
                }
    
                if (itemSpawnLimits) 
                {
                    if (this.itemHasReachedSpawnLimit(itemToAddTemplate, botRole, itemSpawnLimits)) 
                    {
                        // Remove item from pool to prevent it being picked again
                        delete pool[weightedItemTpl];
    
                        i--;
                        continue;
                    }
                }
    
                const newRootItemId = this.hashUtil.generate();
                const itemWithChildrenToAdd: Item[] = [
                    {
                        _id: newRootItemId,
                        _tpl: itemToAddTemplate._id,
                        ...this.botGeneratorHelper.generateExtraPropertiesForItem(itemToAddTemplate, botRole)
                    }
                ];
    
                // Is Simple-Wallet / WZ wallet
                if (this.botConfig.walletLoot.walletTplPool.includes(weightedItemTpl)) 
                {
                    const addCurrencyToWallet = this.randomUtil.getChance100(this.botConfig.walletLoot.chancePercent);
                    if (addCurrencyToWallet) 
                    {
                        // Create the currency items we want to add to wallet
                        const itemsToAdd = this.createWalletLoot(newRootItemId);
    
                        // Get the container grid for the wallet
                        const containerGrid = this.inventoryHelper.getContainerSlotMap(weightedItemTpl);
    
                        // Check if all the chosen currency items fit into wallet
                        const canAddToContainer = this.inventoryHelper.canPlaceItemsInContainer(
                            this.cloner.clone(containerGrid), // MUST clone grid before passing in as function modifies grid
                            itemsToAdd
                        );
                        if (canAddToContainer) 
                        {
                            // Add each currency to wallet
                            for (const itemToAdd of itemsToAdd) 
                            {
                                this.inventoryHelper.placeItemInContainer(
                                    containerGrid,
                                    itemToAdd,
                                    itemWithChildrenToAdd[0]._id,
                                    "main"
                                );
                            }
    
                            itemWithChildrenToAdd.push(...itemsToAdd.flat());
                        }
                    }
                }
                // Some items (ammBox/ammo) need extra changes
                this.addRequiredChildItemsToParent(itemToAddTemplate, itemWithChildrenToAdd, isPmc, botRole);
    
                // Attempt to add item to container(s)
                const itemAddedResult = this.botGeneratorHelper.addItemWithChildrenToEquipmentSlot(
                    equipmentSlots,
                    newRootItemId,
                    itemToAddTemplate._id,
                    itemWithChildrenToAdd,
                    inventoryToAddItemsTo,
                    containersIdFull
                );
    
                // Handle when item cannot be added
                if (itemAddedResult !== ItemAddedResult.SUCCESS) 
                {
                    if (itemAddedResult === ItemAddedResult.NO_CONTAINERS) 
                    {
                        // Bot has no container to put item in, exit
                        this.myLogger.error(
                            `Unable to add: ${totalItemCount} items to bot as it lacks a container to include them`
                        );
                        break;
                    }
    
                    fitItemIntoContainerAttempts++;
                    if (fitItemIntoContainerAttempts >= 4) 
                    {
                        this.myLogger.error(
                            `Failed to place item ${i} of ${totalItemCount} items into ${botRole} containers: ${equipmentSlots.join(
                                ","
                            )}. Tried ${fitItemIntoContainerAttempts} times, reason: ${
                                ItemAddedResult[itemAddedResult]
                            }, skipping`
                        );
    
                        break;
                    }
    
                    // Try again, failed but still under attempt limit
                    continue;
                }
    
                // Item added okay, reset counter for next item
                fitItemIntoContainerAttempts = 0;
    
                // Stop adding items to bots pool if rolling total is over total limit
                if (totalValueLimitRub > 0) 
                {
                    currentTotalRub += this.handbookHelper.getTemplatePrice(itemToAddTemplate._id);
                    if (currentTotalRub > totalValueLimitRub) 
                    {
                        break;
                    }
                }
            }
        }
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
        this.myLogger.debug("Entered custom addRequiredChildItemsToParent");
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