import type { HandbookHelper } from "@spt/helpers/HandbookHelper";
import { ItemHelper } from "@spt/helpers/ItemHelper";
import { BaseClasses } from "@spt/models/enums/BaseClasses";
import { ItemTpl } from "@spt/models/enums/ItemTpl";
import type { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseService } from "@spt/services/DatabaseService";
import { ItemBaseClassService } from "@spt/services/ItemBaseClassService";
import type { ICloner } from "@spt/utils/cloners/ICloner";
import type { DependencyContainer } from "tsyringe";
import itemCfg, { type ItemCfgInfo } from "./itemCfg";
import GridHelper from "./GridHelper";
import { HashUtil } from "@spt/utils/HashUtil";
import type Logger from "./Logger";
import { LoggerLvl } from "./Logger";
import type { IBarterScheme, ITrader } from "@spt/models/eft/common/tables/ITrader";
import { Traders } from "@spt/models/enums/Traders";
import { Money } from "@spt/models/enums/Money";
import { HideoutAreas } from "@spt/models/enums/HideoutAreas";
import type { IHideoutProduction } from "@spt/models/eft/hideout/IHideoutProduction";
import type CfakConfig from "./types/CfakConfig";
import type { ITemplateItem } from "@spt/models/eft/common/tables/ITemplateItem";
import { CustomNewItemTpl, type OriginalMedkitItemTpl } from "./types/Item";

enum BarterSchemeType 
{
    BUY = "Buy",
    BARTER = "Barter",
    EMPTY = "Empty"
}

export default class ItemFactory 
{
    private logger: Logger;
    static container: DependencyContainer;
    static hashUtil: HashUtil;
    static cloner: ICloner;
    static dbService: DatabaseService;
    static itemBaseClassService: ItemBaseClassService;
    static itemHelper: ItemHelper;
    static handbookHelper: HandbookHelper;
    static itemsTable: ReturnType<DatabaseService["getItems"]>;
    static handbook: ReturnType<DatabaseService["getHandbook"]>;

    // Config fields
    private replaceOriginal: boolean;
    private additionalCustomContainersForWhitelist: string[];

    public static init(container: DependencyContainer): void 
    {
        ItemFactory.container = container;
        ItemFactory.itemHelper = container.resolve(ItemHelper);
        ItemFactory.dbService = container.resolve(DatabaseService);
        ItemFactory.itemBaseClassService = container.resolve(ItemBaseClassService);
        ItemFactory.cloner = container.resolve("PrimaryCloner");
        ItemFactory.hashUtil = container.resolve(HashUtil);

        ItemFactory.itemsTable = ItemFactory.dbService.getItems();
        ItemFactory.handbook = ItemFactory.dbService.getHandbook();
    }

    public constructor(
        /** If true, we will replace the original items with custom items.
		 * If false, the custom items will be separate from the vanilla ones.
		 */
        cfakConfig: CfakConfig,
        logger: Logger
    ) 
    {
        this.replaceOriginal = cfakConfig.replaceBaseItems;
        this.additionalCustomContainersForWhitelist = cfakConfig.allowInCustomContainers;
        this.logger = logger;
    }

    /** Creates our custom first aid kits and adds them to barters */
    public createMedkits(): void 
    {
        const traders = ItemFactory.dbService.getTraders();
        this.logger.debug(`Creating custom items - replaceBaseItems = ${this.replaceOriginal}`, true);
        for (const originalId in itemCfg) 
        {
            const details = itemCfg[originalId as OriginalMedkitItemTpl];
            this.createItem(details, this.replaceOriginal, originalId as ItemTpl);
            this.barterChanges(traders, details, this.replaceOriginal, originalId as ItemTpl);
        }
    }

    /** Creates our custom whole blood bag and adds it to barters */
    public createBloodbag(): void 
    {
        const id = CustomNewItemTpl.WHOLE_BLOOD;
        const details = itemCfg[id];
        this.createItem(details);

        const wholeBloodItem = ItemFactory.itemsTable[id];

        // Add SPT Realism stuff
        if (wholeBloodItem._props.ConflictingItems[0] === "SPTRM") // Cloned CAR kit already has SPT Realism fields, just change HP restore
        {
            wholeBloodItem._props.ConflictingItems[6] = "60"; // HP restore amount
        }
        else 
        {
            wholeBloodItem._props.ConflictingItems.splice(0, 0, "SPTRM");
            wholeBloodItem._props.ConflictingItems.splice(1, 0, "medkit");
            wholeBloodItem._props.ConflictingItems.splice(2, 0, "none");
            wholeBloodItem._props.ConflictingItems.splice(3, 0, "0"); // trqnt damage per tick
            wholeBloodItem._props.ConflictingItems.splice(4, 0, "true");
            wholeBloodItem._props.ConflictingItems.splice(5, 0, "");
            wholeBloodItem._props.ConflictingItems.splice(6, 0, "60"); // HP restore amount
            wholeBloodItem._props.ConflictingItems.splice(7, 0, "");
            wholeBloodItem._props.ConflictingItems.splice(8, 0, "");
        }

        this.logger.debug("Updated whole blood with SPTRM info:");
        this.logger.debug(JSON.stringify(wholeBloodItem, null, 4));


        const traders = ItemFactory.dbService.getTraders();
        this.barterChanges(traders, details);
        
        // Add to crafting 
        const craft: IHideoutProduction = {
            _id: "wholebloodcraft",
            areaType: HideoutAreas.MEDSTATION,
            requirements: [
                {
                    areaType: HideoutAreas.MEDSTATION,
                    requiredLevel: 1,
                    type: "Area"
                },
                {
                    templateId: ItemTpl.BARTER_MEDICAL_BLOODSET,
                    count: 1,
                    isFunctional: false,
                    isEncoded: false,
                    type: "Item"
                },
                {
                    templateId: ItemTpl.MEDICAL_ESMARCH_TOURNIQUET,
                    type: "Tool"
                }
            ],
            productionTime: 1000,
            needFuelForAllProductionTime: false,
            locked: false,
            endProduct: "wholeblood",
            continuous: false,
            count: 2,
            productionLimitCount: 0,
            isEncoded: false
        }
        ItemFactory.dbService.getHideout().production.push(craft);
    }


    /**
     * Adds item to barters
     */
    private createItem(details): void 
    /**
    * @param originalTplToCopy If using `replaceOriginal`, this is required
    */
    private createItem(details, replaceOriginal, originalTplToCopy): void 
    /** Creates our custom item adds/replaces it in DB, handbook, etc */
    private createItem(details: ItemCfgInfo, replaceOriginal?: boolean, originalTplToCopy?: ItemTpl): void 
    {
        let ogItem: ITemplateItem;
        if (originalTplToCopy)
        {
            const result = ItemFactory.itemHelper.getItem(originalTplToCopy);
            if (!result[0]) 
            {
                this.logger.error(`Unable to find item to copy ${originalTplToCopy} in item DB`);
                ogItem = null;
            }
            else 
            {
                ogItem = result[1];
            }
        }
        else 
        {
            ogItem = null;
        }

        const idToUse = replaceOriginal ? originalTplToCopy : details.idForNewItem;

        this.logger.debug(`Creating item: ${details.idForNewItem} - ${replaceOriginal ? "WITH" : "NO"} replacement`, true);

        const [succ, itemToClone] = ItemFactory.itemHelper.getItem(
            details.itemToCloneTpl
        );
        if (!succ) 
        {
            this.logger.error(`Couldn't get item for cloning ${itemToClone}`);
        }

        const newItem = ItemFactory.cloner.clone(itemToClone);
        newItem._id = idToUse;
        newItem._parent = details._parent;
        newItem._name = details.idForNewItem;
        newItem._props = {
            ...newItem._props,
            Prefab: details.prefab === "Use Original" ? ogItem._props.Prefab : details.prefab,
            Weight: details.weight ?? details.weight,
            Width: details.width ?? ogItem._props.Width,
            Height: details.height ?? ogItem._props.Height,
            ItemSound: details.itemSound || ogItem._props.ItemSound,
            BackgroundColor: details.backgroundColor || ogItem._props.BackgroundColor,
            ...(details.grids && { Grids: [] }),
            ...(details.otherProps && details.otherProps)
        };

        if (details.grids)
        {
            const gridHelper = new GridHelper(details, ItemFactory.hashUtil, this.logger);

            for (let i = 0; i < details.grids.length; i++) 
            {
                const gridSizes = details.grids[i];
                newItem._props.Grids.push({
                    _name: gridHelper.getGridNameId(i),
                    _id: gridHelper.getGridNameId(i),
                    _parent: idToUse,
                    _props: {
                        filters: [
                            {
                                Filter: details.allowedItems,
                                ExcludedFilter: []
                            }
                        ],
                        minCount: 0,
                        maxCount: 0,
                        isSortingTable: false,
                        maxWeight: 0,
                        ...gridSizes
                    },
                    _proto: "55d329c24bdc2d892f8b4567"
                });
            }
        }

        this.logger.debug("Item template:");
        this.logger.debug(JSON.stringify(newItem, null, 4));

        // For the following, if replaceOriginal is false, we add new entries
        // Otherwise, we modify the existing item since idToUse is the original item's ID

        // Item DB
        ItemFactory.itemsTable[idToUse] = newItem;
        this.logger.debug("Item [added to/replaced in] item DB result:");
        this.logger.debug(JSON.stringify(ItemFactory.itemsTable[idToUse], null, 4));
        
        // Flea prices
        ItemFactory.dbService.getPrices()[idToUse] = details.price;
        this.logger.debug("Item [added to/replaced in] flea prices DB result:");
        this.logger.debug(JSON.stringify(ItemFactory.dbService.getPrices()[idToUse], null, 4));

        if (replaceOriginal) 
        {
            // Handbook
            const hbIdx = ItemFactory.handbook.Items.findIndex(
                (item) => item.Id === idToUse
            ); // Find the item in the handbook item array
            ItemFactory.handbook.Items[hbIdx].Price = details.price; // Id and Parent can stay the same, just change price
            this.logger.debug("Item replaced in handbook result:");
            this.logger.debug(JSON.stringify(ItemFactory.handbook.Items[hbIdx], null, 4));
        }
        else 
        {
            // Handbook
            ItemFactory.handbook.Items.push({
                Id: idToUse,
                ParentId: details.handbookParent,
                Price: details.price
            });
            this.logger.debug("Item added to handbook result:");
            this.logger.debug(JSON.stringify(ItemFactory.handbook.Items[ItemFactory.handbook.Items.length - 1], null, 4));

            // Add to locales (not needed if replacing existing)
            const locale = ItemFactory.dbService.getLocales().global.en;
            locale[`${idToUse} Name`] = details.locale.name;
            locale[`${idToUse} ShortName`] = details.locale.shortName;
            locale[`${idToUse} Description`] = details.locale.description;
            this.logger.debug("Item added to locales result:");
            this.logger.debug(`Name: ${JSON.stringify(locale[`${idToUse} Name`], null, 4)}`);
            this.logger.debug(`ShortName: ${JSON.stringify(locale[`${idToUse} ShortName`], null, 4)}`);
            this.logger.debug(`Description: ${JSON.stringify(locale[`${idToUse} Description`], null, 4)}`);
        }

        // Whitelist in medical containers (since they're now in the Simple Containers base class, not medical items)
        this.logger.debug("Whitelisting in containers...");
        this.allowItemOrBaseClassInContainers(idToUse, [...details.allowedParentContainers, ...this.additionalCustomContainersForWhitelist], details._parent);
    }

    /**
     * Adds item to barters
     */
    private barterChanges(traders, details): void 
    /**
     * @param originalTpl If using `replaceOriginal`, this is required
     */
    private barterChanges(traders, details, replaceOriginal, originalTpl): void 
    private barterChanges(traders: Record<string, ITrader>, details: ItemCfgInfo, replaceOriginal?: boolean, originalTpl?: ItemTpl): void 
    {
        this.logger.debug(`Updating barter schemes - replaceBaseItems = ${this.replaceOriginal}`, true);

        const gridHelper = new GridHelper(details, ItemFactory.hashUtil, this.logger);
        this.logger.debug(`Current item: ${details.idForNewItem}`, true);

        const idToUse = replaceOriginal ? originalTpl : details.idForNewItem;

        // Add contents to all existing barters/purchases
        for (const trader of Object.values(traders)) 
        {
            if (trader.assort?.items == null) continue;
            this.logger.debug(`Current trader: ${trader.base.nickname}`, true);

            /** List of barter schemes we need to add */
            const barterIds: string[] = [];

            if (replaceOriginal) 
            {
                // Find all existing barter schemes for this item
                for (const item of Object.values(trader.assort?.items))
                {
                    if (item._tpl === idToUse) 
                    {
                        barterIds.push(item._id);
                    }
                }
            }
            if (trader.base._id === details.soldBy) 
            {
                // Add the empty container to barters (if specified)
                if (details.traderSellsEmptyToo)
                {
                    const barterEmptyId = this.getBarterId(idToUse, BarterSchemeType.EMPTY, 0);
                    const newIdxDebug = this.addBaseContainerToAssortItems(barterEmptyId, idToUse, trader);
                    this.logger.debug(`Added to assort items: ${JSON.stringify(trader.assort?.items[newIdxDebug], null, 4)}`);
                    barterIds.push(barterEmptyId);
                }

                if (!replaceOriginal)
                {
                    // Add custom item as a new barter
                    // Buy with money
                    const barterBuyId = this.getBarterId(idToUse, BarterSchemeType.BUY, 0);
                    let newIdxDebug = this.addBaseContainerToAssortItems(barterBuyId, idToUse, trader);
                    this.logger.debug(`Added to assort items: ${JSON.stringify(trader.assort?.items[newIdxDebug], null, 4)}`);
                    barterIds.push(barterBuyId);
                    // Buy with barter items
                    if (details.customBarter != null) 
                    {
                        const barterBarterId = this.getBarterId(idToUse, BarterSchemeType.BARTER, 0);
                        newIdxDebug = this.addBaseContainerToAssortItems(barterBarterId, idToUse, trader);
                        barterIds.push(barterBarterId);
                        this.logger.debug(`Added to assort items: ${trader.assort?.items[newIdxDebug]}`);
                    }
                }
            }

            // Add items to and add barter scheme for everything
            for (const barterId of barterIds) 
            {
                const bType = this.getBarterSchemeDetails(barterId);

                // Add items to slots, obv empty buy scheme doesn't come with items...
                if (bType !== BarterSchemeType.EMPTY && details.grids) 
                {
                    gridHelper.addItemsToGridSlots(barterId, trader.assort.items);
                }

                // Don't modify/add original buy/barter scheme info
                if (replaceOriginal && bType !== BarterSchemeType.EMPTY) continue;
                    
                this.logger.debug(`Current barter to [add/update]: ${barterId}`, true);

                // Add barter details
                let barterScheme: IBarterScheme[][];
                switch (bType)
                {
                    case BarterSchemeType.BARTER:
                        barterScheme = details.customBarter;
                        break;
                    case BarterSchemeType.BUY:
                        barterScheme = [
                            [{
                                _tpl: details.currency,
                                count: details.bundlePrice ?? details.price // price as fallback for non-bundled stuff
                            }]
                        ];
                        break;
                    case BarterSchemeType.EMPTY:
                        barterScheme = [
                            [{
                                _tpl: details.currency,
                                count: details.price
                            }]
                        ];
                }
                trader.assort.barter_scheme[barterId] = barterScheme;
                this.logger.debug(`Added barter scheme: ${JSON.stringify(trader.assort.barter_scheme[barterId], null, 4)}`);
                // Add loyalty level info
                trader.assort.loyal_level_items[barterId] = details.loyalLevel[bType.toLowerCase()];
                this.logger.debug(`Added loyalty level: ${trader.assort.loyal_level_items[barterId]}`);
            }
        }
    }

    /**
     * @returns the index of the item we just pushed
     */
    private addBaseContainerToAssortItems(
        /** The ID that identifies this specific barter entry (can have multiple for the same item type) */
        barterId: string, 
        /** The ID that identifies this item template */
        itemTplId: string, 
        /** The trader's DB */
        trader: ITrader)
    {
        return trader.assort?.items?.push(
            {
                _id: barterId,
                _tpl: itemTplId,
                parentId: "hideout",
                slotId: "hideout",
                upd: {
                    UnlimitedCount: true,
                    StackObjectsCount: 999999,
                    BuyRestrictionMax: 5,
                    BuyRestrictionCurrent: 0
                }
            }
        ) - 1;
    }

    /** Unique ID for each barter */
    private getBarterId(id: string, type: BarterSchemeType, idx: number) 
    {
        return `${id}69${type}69${idx}`;
    }

    private getBarterSchemeDetails(id: string): BarterSchemeType
    {
        const split = id.split("69");
        return split[1] as BarterSchemeType;
    }

    /**
     * Adds an item or base class to container(s)'s whitelist
     */
    private allowItemOrBaseClassInContainers(itemTplOrBaseClass: string, containerTpls: string[], parent?: string): void
    {
        if (!containerTpls.length) return;
        const itemDb = ItemFactory.dbService.getItems();
        for (const containerTpl of containerTpls) 
        {
            const container = itemDb[containerTpl];
            this.logger.debug(`Container grids before modifying whitelist: ${JSON.stringify(container._props.Grids, null, 4)}`)
            if (!container)
            {
                this.logger.error(`Unable to get container item: ${containerTpl}`);
                return;
            }
            const grids = container._props.Grids;
            if (!grids?.length)
            {
                this.logger.debug(`Container has no grids to update filters for: ${containerTpl}`);
                return;
            }
            // Check each grid
            for (const grid of grids)
            {
                const filters = grid._props.filters;
                // Check each filter in the grid
                for (const filter of filters)
                {
                    if (filter.Filter.length === 0) continue; // Everything is allowed already

                    const whitelistMap = new Map<string, boolean>();
                    for (const item of filter.Filter)
                    {
                        whitelistMap.set(item, true);
                    }
                    if (whitelistMap.has(itemTplOrBaseClass) || (parent != null && whitelistMap.has(parent))) continue; // Has this item or its parent whitelisted

                    filter.Filter.push(itemTplOrBaseClass);
                }
            }
            this.logger.debug(`Added to container whitelist grids: ${JSON.stringify(container._props.Grids, null, 4)}`)
        }
    }
}
