<!-- One interface of the contract; index and rules: INTERFACES.md -->

## I-4 Place type symbols **[1.1]**. Provider: **map** (`map/typeicons.js`). Consumer: **sidebar**

`typeIcon(type)` returns the small HTML symbol of a place type (used in lists and details) and `TYPE_STYLE` holds its shape and
colour, so the list shows the same symbol as the map. The sidebar only calls `typeIcon`; it never reads `TYPE_STYLE`. **[1.5]** `typeIcon(type)` keeps its signature and, once `AHM.map.setTypes` has been called, draws from the types dictionary (I-8).
