# Custom First Aid Kits Mod ![Static Badge](https://img.shields.io/badge/SPT-3.9.8-white?style=flat&labelColor=blue)

For **SPT 3.9.8**

This server mod aims to make first aid kits a bit more realistic, turning them into containers and optionally replacing the original medkits altogether. You can place bandages, hemostats, splints, injectors, balms, emergency water, and AI-2 in most of them (CAR does not hold hemostats for balance purposes).

E.g. to use an IFAK, you place bandages & tourniquets inside and carry it with you.

The custom first aid kits are sold by traders and come with medical items in them. They also sell empty IFAK and AFAK pouches for you to add to your kit.

***Note:* This mod requires the client mod [TradersSellBundles](https://github.com/kyoukopan/TradersSellBundles/tree/main)!**

![image](https://github.com/user-attachments/assets/766fcdd7-40b8-4a7b-b6c9-780b95a20422)

## Installation
1. Ensure you have [TradersSellBundles](https://github.com/kyoukopan/TradersSellBundles/tree/main)
2. Unzip the *.zip file
3. Copy/drag the `user` folder into your SPT directory

## Config
The `replaceBaseItems` in `config.json` can be `true` or `false`.
- If `true`, the original medkits will be replaced with the custom ones. If `false` the custom medkits will be added as separate items to the game, and the originals will retain their original behavior.
- If `true`, when bots spawn with medkits, we will try to insert items into them (so you don't pick up empty medkits off someone you just killed).

**_When uninstalling this mod, if you have `replaceBaseItems=false`, make sure to delete the custom medkits!_**

## Compatibility
Mods that I used during testing (should be compatible): SPT Realism, Algorithmic Level Progression, SWAG/DONUTS, SAIN.

If you are having issues with Realism, try making sure this loads after Realism.

## Known/Possible Issues
- (Not implemented) Items are not added to medkits that are found as loot during raids
- (Not implemented) The custom medkits created when `replaceBaseItems=false` have not been added to bot/world loot tables, so they are not expected to spawn on bots/in raid in this case
- (Possible issue) Because `replaceBaseItems=true` modifies the original medkit items, there is always a possibility that this can cause bugs
