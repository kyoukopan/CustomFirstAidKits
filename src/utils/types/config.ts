import { ItemTpl } from "@spt/models/enums/ItemTpl";

export interface CfakItemConfig 
{
    interiorGrid: {
        vertical: number,
        horizontal: number,
    }
}

export default interface CfakConfig 
{
    replaceBaseItems: boolean;
    items: Record<ItemTpl, CfakItemConfig>;
}