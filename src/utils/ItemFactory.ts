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

const handbookMedkitsId = "5b47574386f77428ca22b338";

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

    private replaceOriginal: boolean;

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
        replaceOriginal: boolean,
        logger: Logger
    ) 
    {
        this.replaceOriginal = replaceOriginal;
        this.logger = logger;
    }

    /** Creates our custom first aid kits and adds/replaces them in DB, handbook, etc */
    public createItems(): void 
    {
        this.logger.debug(`Creating custom items - replaceBaseItems = ${this.replaceOriginal}`, true);
        for (const originalId in itemCfg) 
        {
            const details = itemCfg[originalId as ItemTpl];
            const [succ, ogItem] = ItemFactory.itemHelper.getItem(originalId);
            const idToUse = this.replaceOriginal ? originalId : details.idForNewItem;

            this.logger.debug(`Current item: ${details.idForNewItem}`, true);

            if (!succ) 
            {
                this.logger.error(`Unable to find original item ${originalId} in item DB`);
            }

            const [siccSucc, sicc] = ItemFactory.itemHelper.getItem(
                ItemTpl.CONTAINER_SICC
            );
            if (!siccSucc) 
            {
                this.logger.error("Couldn't get original SICC for cloning");
            }

            const newItem = ItemFactory.cloner.clone(sicc);
            newItem._id = idToUse;
            newItem._parent = BaseClasses.SIMPLE_CONTAINER;
            newItem._name = details.idForNewItem;
            newItem._props = {
                ...newItem._props,
                Prefab: ogItem._props.Prefab,
                Grids: [],
                Weight: details.weight,
                Width: ogItem._props.Width,
                Height: ogItem._props.Height,
                ItemSound: ogItem._props.ItemSound,
                BackgroundColor: ogItem._props.BackgroundColor
            };

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

            if (this.replaceOriginal) 
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
                    ParentId: handbookMedkitsId,
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
        }
    }

    /** Adds/updates barter schemes with filled first aid kits */
    public barterChanges(): void 
    {
        this.logger.debug(`Updating barter schemes - replaceBaseItems = ${this.replaceOriginal}`, true);
        const traders = ItemFactory.dbService.getTraders();
        for (const originalId in itemCfg) 
        {
            const details: ItemCfgInfo = itemCfg[originalId as ItemTpl];
            const gridHelper = new GridHelper(details, ItemFactory.hashUtil, this.logger);
            this.logger.debug(`Current item: ${details.idForNewItem}`, true);

            const idToUse = this.replaceOriginal ? originalId : details.idForNewItem;

            // Add contents to all existing barters/purchases
            for (const trader of Object.values(traders)) 
            {
                if (trader.assort?.items == null) continue;
                this.logger.debug(`Current trader: ${trader.base.nickname}`, true);

                /** List of barter schemes we need to add */
                const barterIds: string[] = [];

                if (this.replaceOriginal) 
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

                    if (!this.replaceOriginal)
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
                    if (bType !== BarterSchemeType.EMPTY) 
                    {
                        gridHelper.addItemsToGridSlots(barterId, trader.assort.items);
                    }

                    // Don't modify/add original buy/barter scheme info
                    if (this.replaceOriginal && bType !== BarterSchemeType.EMPTY) continue;
                    
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
                                    count: details.bundlePrice
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
}
