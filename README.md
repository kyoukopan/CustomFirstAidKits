# Custom First Aid Kits Mod ![Static Badge](https://img.shields.io/badge/SPT-3.9.8-white?style=flat&labelColor=blue)

For **SPT 3.9.8**

***Note:* This mod requires the client mod [TradersSellBundles](https://github.com/kyoukopan/TradersSellBundles/tree/main)!**

### First aid kits

This server mod aims to make first aid kits a bit more realistic, turning them into containers and optionally replacing the original medkits altogether. You can place bandages, hemostats, splints, injectors, balms, emergency water, and AI-2 in most of them (CAR does not hold hemostats for balance purposes).

E.g. to use an IFAK, you place bandages & tourniquets inside and carry it with you.

The custom first aid kits are sold by traders and come with medical items in them. They also sell empty IFAK and AFAK pouches for you to add to your kit.

<img src="https://github.com/user-attachments/assets/766fcdd7-40b8-4a7b-b6c9-780b95a20422" width="250px" />

### Healing

Therapist sells whole blood (WB) that can be used to heal (in-raid if vanilla, out of raid if SPT Realism). You can also craft it at Medstation level 1.

<img src="https://github.com/user-attachments/assets/3c19c743-ad2c-4922-affb-24c5adae7d6c" width="250px" />


## Installation
1. Ensure you have [TradersSellBundles](https://github.com/kyoukopan/TradersSellBundles/tree/main)
2. Unzip the *.zip file
3. Copy/drag the `user` folder into your SPT directory

## Config
The `replaceBaseItems` in `config.json` can be `true` or `false`.
- If `true`, the original medkits will be replaced with the custom ones. If `false` the custom medkits will be added as separate items to the game, and the originals will retain their original behavior.
- If `true`, when bots spawn with medkits, we will try to insert items into them (so you don't pick up empty medkits off someone you just killed).

`allowInCustomContainers` in `config.json` is an array that you can use to specify any additional modded or vanilla containers that should accept this mod's items. 
- Because the medkits in this mod don't use the base medical item class, other mods' medical containers might not accept them without this config. Please make sure to load this after the mod that introduces the containers.

## Compatibility
Mods that I used during testing (should be compatible): SPT Realism, Algorithmic Level Progression, SWAG/DONUTS, SAIN.

If you are having issues with Realism, try making sure this loads after Realism.

**_When uninstalling this mod, make sure to delete the custom items from your inventory!_**

## Known/Possible Issues
- (Not implemented) Items are not added to medkits that are found as loot during raids
- (Not implemented) The custom medkits created when `replaceBaseItems=false` have not been added to bot/world loot tables, so they are not expected to spawn on bots/in raid in this case
- (Possible issue) Because `replaceBaseItems=true` modifies the original medkit items, there is always a possibility that this can cause bugs
- (Known issue) Dropping a medkit and then using the interaction menu to search the dropped item doesn't display all the items in the container. Upon picking it up again, you should see all the items. This seems to be an issue that happens with other mods as well that introduce multi-grid containers.
