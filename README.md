# empire-public

A open source bot to automatically withdraw / deposit skins on empire with customizable pricing.

## Requirements

Pricempire / Custom price oracle. https://pricempire.com/user/api

CSGOEmpire API token https://csgoempire.com/trading/apikey

## Installation Guide

It is recommended to install this on WSL, but this guide is written for windows users as I assume anyone using WSL will know how to install this.

### NVM (Node Version Manager)

Install the latest nvm-setup.exe https://github.com/coreybutler/nvm-windows/releases

### PNPM (best node package manager)

Run this in powershell `iwr https://get.pnpm.io/install.ps1 -useb | iex` This command was found from https://pnpm.io/installation

### Redis Cache

It is recommended to just set up a free redis cache from https://aiven.io/. Choose the one nearest to you. This helps store objects when restarting the bot.

## Configuration

### Filter configuration

**FILTER_MIN_PRICEMPIRE_LIQUIDITY_SCORE**: The minimum liquidity score required to purchase an item.

**FILTER_STAT_TRACK**: "true" / "false". true = no stat track items will be bought. false = stat track items will be bought

**FILTER_COMMODITY**: "true" / "false". true = no commodities will be bought. false = will be bought. Commodities are cases, stickers, agents, ect.

**FILTER_MAX_PRICE**: The maximum price in _coins_ that an item will be bought for.

**FILTER_MIN_PRICE**: The minimum price in _coins_ that an item will be bought for.

**PROFIT_MARGIN**: The decimal 1.xx multiple you want to profit on every trade. 0.08 means you will make 8% profit based on the price calculations you have set.

**item_blacklists.txt**: A file that stores a list of items you do not want to purchase. It is recommended to put items like Black Pearls / Gems in here.

### Deposit configuration

**OVERPRICE_MAX_PERCENT**: The % you want to overprice your item when its first listed. 0.05 means you will list your item at 105% at first.

**UNDERPRICE_MIN_PERCENT**: The % you are willing to underprice your item over time. 0.02 means you will at least sell your item at 98%.

**OVERPRICE_HALF_LIFE**: ThThe time in minutes it takes for the item's overprice to decay to half of the difference between the maximum overprice and the minimum underprice.

### Pricing configuration

When instantiating a new pricing oracle you are able to select the pricempire providers you would like to use in your average price.

`const pricing = new PricingOracle(5 * 60 * 1000,  ['buff_avg7', 'csgoempire_avg7', 'csgoempire_lastsale',])`
