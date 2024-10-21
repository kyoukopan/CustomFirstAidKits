import type { Item } from "@spt/models/eft/common/tables/IItem";
import itemCfg, { type ItemCfgInfo } from "../db/itemCfg";
import GridHelper from "./GridHelper";
import { type CustomMedkitItemTpl, type OriginalMedkitItemTpl, customToOriginalMap, isCustomMedkitItemTpl, isOriginalMedkitItemTpl } from "./types/Item";
import type { HashUtil } from "@spt/utils/HashUtil";
import type Logger from "./Logger";

/**
 * Adds child items to medkit container.
 * Based on {@link BotLootGenerator.createWalletLoot}
 * @returns Array containing bundled items, NOT INCLUDING the medkit item
 */
export function addMedkitLoot(
    /** The medkit's unique item ID, not the Tpl Id */
    medkitId: string, 
    /** The medkit's Tpl Id */
    itemTpl: CustomMedkitItemTpl | OriginalMedkitItemTpl,
    replaceBaseItems: boolean,
    hashUtil: HashUtil,
    myLogger: Logger
): Item[]
{
    const result: Item[] = [];
    const medkitDetails: ItemCfgInfo =  replaceBaseItems ? itemCfg[itemTpl] : itemCfg[customToOriginalMap[itemTpl]]; // If not replaceBaseItems, itemTpl passed in is the custom ID which we must reverse lookup since itemCfg is indexed by original Tpl id
    const gridHelper = new GridHelper(medkitDetails, hashUtil, myLogger);
    myLogger.debug(`Adding medkit loot to ${medkitDetails.idForNewItem}`);
    const succ = gridHelper.addBundledItemsToGridSlots(medkitId, result);
    myLogger.debug(`Item array after adding stuffs: ${JSON.stringify(result, null, 4)}`);
    if (!succ) 
    {
        myLogger.error(`Unable to add medkit loot to ${itemTpl} (${medkitDetails.idForNewItem})`);
        return [];
    }

    return result;
}

/**
 * Checks if the item is a medkit item, and if so, adds the bundled items to item array
 * If we replace base items check for original ID, else check for custom ID
 */
export function conditionallyAddMedkitLoot(itemTpl: string, itemArray: Item[], replaceBaseItems: boolean, myLogger: Logger, hashUtil: HashUtil): void
{
    if (replaceBaseItems ? isOriginalMedkitItemTpl(itemTpl) : isCustomMedkitItemTpl(itemTpl)) 
    {
        // If replace, itemTpl is OriginalMedkitItemTl, if not, itemTpl is CustomMedkitItemTpl
        const items = addMedkitLoot(itemArray[0]._id, itemTpl as OriginalMedkitItemTpl | CustomMedkitItemTpl, replaceBaseItems, hashUtil, myLogger);
        itemArray.push(...items);
        myLogger.debug(`itemToAddChildrenTo after pushing stuff ${JSON.stringify(itemArray, null, 4)}`);
    }
}