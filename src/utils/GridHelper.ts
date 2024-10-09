import type { Item } from "@spt/models/eft/common/tables/IItem";
import type { ItemCfgInfo } from "../db/itemCfg";
import type { HashUtil } from "@spt/utils/HashUtil";
import type Logger from "./Logger";
import { LoggerLvl } from "./Logger";

export default class GridHelper 
{
    public constructor(
        protected itemDetails: ItemCfgInfo,
        protected hashUtil: HashUtil,
        protected logger: Logger
    ) 
    {}
    
    /** Returns the number of total slots in each of the item's grids. e.g. [1,2] = 1 slot in first grid and 2 in second */
    public getGridSlotCounts(): number[] 
    {
        const result: number[] = [];
        for (const grid of this.itemDetails.grids) 
        {
            result.push(grid.cellsH * grid.cellsV);
        }
        return result;
    }

    /** Used to identify the grid props inside each item 
     * Format is ${CustomId}Grid${GridCountIndex} e.g. CustomIFAKGrid1
    */
    public getGridNameId(idx: number): string
    {
        return `${this.itemDetails.idForNewItem}Grid${idx}`;
    }

    /**
     * Tries to add bundled items to this container's grids
     * @param parentId The ID of the item to add to - not the Tpl ID, the ID of the unique item
     * @param items Items array to add to (e.g. a trader assort's items array, a bot's inventory array)
     * @returns whether it was successful
     */
    public addItemsToGridSlots(
        parentId: string, 
        items: Item[])
        : boolean
    {
        const gridSlotCounts = this.getGridSlotCounts();
        try 
        {
            let currGrid = 0; // Can have multiple grids in each kit
            let currSlotInGrid = 0; // Tracks which slots we have filled so we don't go out of bounds
            for (const currItem in this.itemDetails.bundled) 
            {
                items?.push({
                    _id: this.hashUtil.generate(),
                    _tpl: this.itemDetails.bundled[currItem],
                    parentId: parentId,
                    slotId: this.getGridNameId(currGrid)
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
            return true;
        }
        catch 
        {
            this.logger.log(`Error adding items into container for ID ${parentId}`, LoggerLvl.ERROR);
            return false;
        }
    }
}