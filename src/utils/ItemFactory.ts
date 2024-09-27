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

const handbookMedkitsId = "5b47574386f77428ca22b338";

export default class ItemFactory 
{
    static container: DependencyContainer;
    static logger: ILogger;
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
        ItemFactory.logger = container.resolve("WinstonLogger");
        ItemFactory.cloner = container.resolve("PrimaryCloner");

        ItemFactory.itemsTable = ItemFactory.dbService.getItems();
        ItemFactory.handbook = ItemFactory.dbService.getHandbook();
    }

    public constructor(
        /** If true, we will replace the original items with custom items.
		 * If false, the custom items will be separate from the vanilla ones.
		 */
        replaceOriginal: boolean
    ) 
    {
        this.replaceOriginal = replaceOriginal;
    }

    /** Creates our custom first aid kits and adds/replaces them in DB, handbook, etc */
    public createItems(): void 
    {
        for (const originalId in itemCfg) 
        {
            const details = itemCfg[originalId as ItemTpl];
            const [succ, ogItem] = ItemFactory.itemHelper.getItem(originalId);
            const idToUse = this.replaceOriginal ? originalId : details.idForNewItem;
            if (!succ) 
            {
                ItemFactory.logger.error(
                    `Custom First Aid Kits: Unable to find original item ${originalId} in item DB`
                );
            }

            const [siccSucc, sicc] = ItemFactory.itemHelper.getItem(
                ItemTpl.CONTAINER_SICC
            );
            if (!siccSucc) 
            {
                ItemFactory.logger.error(
                    "Custom First Aid Kits: Couldn't get original SICC for cloning"
                );
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
                ItemSound: ogItem._props.ItemSound
            };

            for (let i = 0; i < details.grids.length; i++) 
            {
                const gridSizes = details.grids[i];
                newItem._props.Grids.push({
                    _name: this.getGridNameId(details.idForNewItem, i),
                    _id: this.getGridNameId(details.idForNewItem, i),
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

            // For the following, if replaceOriginal is false, we add new entries
            // Otherwise, we modify the existing item since idToUse is the original item's ID

            // Item DB
            ItemFactory.itemsTable[idToUse] = newItem;
            // Flea prices
            ItemFactory.dbService.getPrices()[idToUse] = details.price;

            if (this.replaceOriginal) 
            {
                // Handbook
                const hbIdx = ItemFactory.handbook.Items.findIndex(
                    (item) => item.Id === idToUse
                ); // Find the item in the handbook item array
                ItemFactory.handbook.Items[hbIdx].Price = details.price; // Id and Parent can stay the same, just change price
            }
            else 
            {
                // Handbook
                ItemFactory.handbook.Items.push({
                    Id: idToUse,
                    ParentId: handbookMedkitsId,
                    Price: details.price
                });

                // Add to locales (not needed if replacing existing)
                const locale = ItemFactory.dbService.getLocales().global.en;
                locale[`${idToUse} Name`] = details.locale.name;
                locale[`${idToUse} ShortName`] = details.locale.shortName;
                locale[`${idToUse} Description`] = details.locale.description;
            }
        }
    }

    /** Adds/updates barter schemes with filled first aid kits */
    public barterChanges(): void 
    {
        const traders = ItemFactory.dbService.getTraders();
        for (const originalId in itemCfg) 
        {
            const details = itemCfg[originalId as ItemTpl];
            const gridSlotCounts = this.getGridSlotCounts(details);
            const idToUse = this.replaceOriginal ? originalId : details.idForNewItem;

            // Add contents to all existing barters/purchases
            for (const trader of Object.values(traders)) 
            {
                // Find all barter IDs that have this item as a product or make our own
                const barterIds: string[] = [];
                if (this.replaceOriginal) 
                {
                    for (const item of Object.values(trader.assort?.items))
                    {
                        if (item._tpl === idToUse) 
                        {
                            barterIds.push(item._id);
                        }
                    }
                }
                else 
                {
                    // Add a new base item for barters
                    if (trader.base._id === details.soldBy) 
                    {
                        const barterBuyId = this.getBarterId(idToUse, "Buy", 0);
                        trader.assort?.items?.push({
                            _id: barterBuyId,
                            _tpl: idToUse,
                            parentId: "hideout",
                            slotId: "hideout",
                            upd: {
                                UnlimitedCount: true,
                                StackObjectsCount: 999999,
                                BuyRestrictionMax: 5,
                                BuyRestrictionCurrent: 0
                            }
                        });
                        barterIds.push(barterBuyId);
                        if (details.customBarter != null) 
                        {
                            const barterBarterId = this.getBarterId(idToUse, "Barter", 0);
                            trader.assort?.items?.push({
                                _id: barterBarterId,
                                _tpl: idToUse,
                                parentId: "hideout",
                                slotId: "hideout",
                                upd: {
                                    UnlimitedCount: true,
                                    StackObjectsCount: 999999,
                                    BuyRestrictionMax: 5,
                                    BuyRestrictionCurrent: 0
                                }
                            });
                            barterIds.push(barterBarterId);
                        }
                    }
                }
                for (const barterId of barterIds) 
                {
                    if (!this.replaceOriginal) 
                    {
                        // Add barter details
                        const bType = this.getBarterSchemeDetails(barterId);
                        trader.assort.barter_scheme[barterId] = [...(bType === "Barter" ? details.customBarter : [
                            [{
                                _tpl: details.currency,
                                count: details.bundlePrice
                            }]
                        ])];
                        // Add loyalty level info
                        trader.assort.loyal_level_items[barterId] = details.loyalLevel[bType.toLowerCase()];
                    }

                    // Add items to slots
                    try 
                    {
                        let currGrid = 0; // Can have multiple grids in each kit
                        let currSlotInGrid = 0; // Tracks which slots we have filled so we don't go out of bounds
                        for (const currItem in details.bundled) 
                        {
                            trader.assort?.items?.push({
                                _id: `${barterId}Item${currItem}`,
                                _tpl: details.bundled[currItem],
                                parentId: barterId,
                                slotId: this.getGridNameId(details.idForNewItem, currGrid)
                            });
                            if (currSlotInGrid === gridSlotCounts[currGrid] - 1) 
                            {
                                currGrid++;
                                currSlotInGrid = 0;
                            }
                            else 
                            {
                                currSlotInGrid++;
                            }
                        }
                    }
                    catch 
                    {
                        ItemFactory.logger.error(
                            `Custom First Aid Kits: Error adding items into barter for barter ID ${barterId}`
                        );
                    }
                }
            }
        }
    }

    /** Returns the number of total slots in each of the item's grids. e.g. [1,2] = 1 slot in first grid and 2 in second */
    private getGridSlotCounts(item: ItemCfgInfo): number[] 
    {
        const result: number[] = [];
        for (const grid of item.grids) 
        {
            result.push(grid.cellsH * grid.cellsV);
        }
        return result;
    }

    /** Used to identify the grid props inside each item */
    private getGridNameId(id: string, idx: number) 
    {
        return `${id}Grid${idx}`;
    }

    /** Unique ID for each barter */
    private getBarterId(id: string, type: "Buy" | "Barter", idx: number) 
    {
        return `${id}99${type}99${idx}`;
    }

    private getBarterSchemeDetails(id: string): "Buy" | "Barter"
    {
        const split = id.split("99");
        return split[1] as "Buy" | "Barter";
    }
}
