"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = process.cwd();
const dataFile = path.join(root, "car_prices.csv");
if (!fs.existsSync(dataFile)) {
  throw new Error(`Dataset not found: ${dataFile}`);
}

const project = "Vehicle Auction Performance";
const reportDir = path.join(root, `${project}.Report`);
const modelDir = path.join(root, `${project}.SemanticModel`);
const reportDefinition = path.join(reportDir, "definition");
const pagesDir = path.join(reportDefinition, "pages");
const modelDefinition = path.join(modelDir, "definition");
const tablesDir = path.join(modelDefinition, "tables");
const table = "car_prices";
const measuresTable = "_Measures";

for (const generatedDir of [reportDir, modelDir]) {
  fs.rmSync(generatedDir, { recursive: true, force: true });
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function lineage() {
  return crypto.randomUUID();
}

function sourceRef(entity) {
  return { Expression: { SourceRef: { Entity: entity } } };
}

function measureField(name) {
  return { Measure: { Expression: sourceRef(measuresTable), Property: name } };
}

function columnField(entity, name) {
  return { Column: { Expression: sourceRef(entity), Property: name } };
}

function projection(field, queryRef, displayName = queryRef.split(".").at(-1)) {
  return { field, queryRef, nativeQueryRef: displayName, displayName, active: true };
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function visual(pageId, type, bounds, title, queryState, sortDefinition) {
  const id = crypto.randomBytes(10).toString("hex");
  const content = {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.7.0/schema.json",
    name: id,
    position: { x: bounds.x, y: bounds.y, z: bounds.z || 0, height: bounds.h, width: bounds.w, tabOrder: bounds.z || 0 },
    visual: {
      visualType: type,
      query: { queryState, ...(sortDefinition ? { sortDefinition } : {}) },
      drillFilterOtherVisuals: true
    },
    visualContainerObjects: {
      title: [{ properties: { show: literal("true"), text: literal(`'${title.replaceAll("'", "''")}'`) } }]
    }
  };
  const dir = path.join(pagesDir, pageId, "visuals", id);
  writeJson(path.join(dir, "visual.json"), content);
}

function fieldProjection(entity, column) {
  return projection(columnField(entity, column), `${entity}.${column}`, column);
}

function measureProjection(name) {
  return projection(measureField(name), `${measuresTable}.${name}`, name);
}

function card(page, x, title, measure) {
  visual(page, "card", { x, y: 18, w: 290, h: 94 }, title, {
    Values: { projections: [measureProjection(measure)] }
  });
}

function slicer(page, x, y, w, title, column) {
  visual(page, "slicer", { x, y, w, h: 72, z: 20 }, title, {
    Values: { projections: [fieldProjection(table, column)] }
  });
}

function chart(page, type, bounds, title, axisColumn, measures, sortMeasure) {
  const queryState = {
    Category: { projections: [fieldProjection(table, axisColumn)] },
    Y: { projections: measures.map(measureProjection) }
  };
  const sortDefinition = sortMeasure ? {
    sort: [{ field: measureField(sortMeasure), direction: "Descending" }]
  } : undefined;
  visual(page, type, bounds, title, queryState, sortDefinition);
}

function page(id, displayName) {
  fs.mkdirSync(path.join(pagesDir, id), { recursive: true });
  writeJson(path.join(pagesDir, id, "page.json"), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
    name: id,
    displayName,
    displayOption: "FitToPage",
    height: 720,
    width: 1280,
    visibility: "Visible"
  });
}

const overview = "4f1c8a3d9b6e20a175cd";
const products = "a1b2c3d4e5f60718293a";
const regional = "e7f6d5c4b3a291807162";

page(overview, "Executive Overview");
page(products, "Product Analysis");
page(regional, "Regional Analysis");

for (const [x, title, measure] of [
  [24, "Valid auction listings", "Valid Auction Listings"],
  [334, "Gross auction value", "Gross Auction Value"],
  [644, "Average sold price", "Average Sale Price"],
  [954, "Average gap to MMR", "Average Gap to MMR"]
]) card(overview, x, title, measure);

for (const [x, title, column, width] of [
  [24, "Vehicle year", "year", 174],
  [208, "Make", "make", 225],
  [441, "Body type", "body", 190],
  [639, "Auction state", "state", 174],
  [823, "Transmission", "transmission", 210]
]) slicer(overview, x, 125, width, title, column);

chart(overview, "lineChart", { x: 24, y: 210, w: 740, h: 276 }, "Auction price vs MMR by date", "auctionDate", [
  "Average Sale Price", "Average MMR"
]);
chart(overview, "clusteredBarChart", { x: 780, y: 210, w: 476, h: 276 }, "Average price gap by state", "state", [
  "Average Gap to MMR"
]);
chart(overview, "clusteredBarChart", { x: 24, y: 496, w: 602, h: 198 }, "Top 10 makes by listings", "make", [
  "Top 10 Make Listings"
], "Top 10 Make Listings");
chart(overview, "clusteredColumnChart", { x: 642, y: 496, w: 614, h: 198 }, "Average sold price by body type", "body", [
  "Average Sale Price"
], "Average Sale Price");

for (const [x, title, column, width] of [
  [24, "Make", "make", 260],
  [292, "Body type", "body", 205],
  [505, "Vehicle year", "year", 185]
]) slicer(products, x, 20, width, title, column);

chart(products, "clusteredBarChart", { x: 24, y: 109, w: 802, h: 338 }, "Top 10 vehicle models by auction value", "productName", [
  "Top 10 Product Value"
], "Top 10 Product Value");
chart(products, "clusteredBarChart", { x: 842, y: 109, w: 414, h: 338 }, "Average price by body type", "body", [
  "Average Sale Price"
], "Average Sale Price");
chart(products, "lineChart", { x: 24, y: 466, w: 802, h: 230 }, "Average price by vehicle year", "year", [
  "Average Sale Price", "Average MMR"
]);
chart(products, "clusteredColumnChart", { x: 842, y: 466, w: 414, h: 230 }, "Average price by transmission", "transmission", [
  "Average Sale Price"
], "Average Sale Price");

for (const [x, title, column, width] of [
  [24, "Vehicle year", "year", 225],
  [257, "Make", "make", 245],
  [510, "Body type", "body", 210],
  [728, "Transmission", "transmission", 235]
]) slicer(regional, x, 20, width, title, column);

chart(regional, "clusteredBarChart", { x: 24, y: 112, w: 610, h: 582 }, "Average sale price gap to MMR by state", "state", [
  "Average Gap to MMR"
], "Valid Auction Listings");
chart(regional, "clusteredBarChart", { x: 650, y: 112, w: 606, h: 582 }, "Auction listings by state", "state", [
  "Valid Auction Listings"
], "Valid Auction Listings");

const columnSpecs = [
  ["year", "int64", "0", "none"],
  ["make", "string", undefined, "none"],
  ["model", "string", undefined, "none"],
  ["trim", "string", undefined, "none"],
  ["productName", "string", undefined, "none"],
  ["body", "string", undefined, "none"],
  ["transmission", "string", undefined, "none"],
  ["vin", "string", undefined, "none"],
  ["state", "string", undefined, "none"],
  ["condition", "double", "0.00", "none"],
  ["odometer", "double", "#,0", "none"],
  ["color", "string", undefined, "none"],
  ["interior", "string", undefined, "none"],
  ["seller", "string", undefined, "none"],
  ["mmr", "double", "$#,0.00;($#,0.00);-", "sum"],
  ["sellingprice", "double", "$#,0.00;($#,0.00);-", "sum"],
  ["saledate", "string", undefined, "none"],
  ["auctionDate", "dateTime", "MMM d, yyyy", "none"]
];

const uniqueColumns = [...new Map(columnSpecs.map(spec => [spec[0], spec])).values()];
let tableTmdl = "table car_prices\n";
for (const [name, type, format, summary] of uniqueColumns) {
  tableTmdl += `\n\tcolumn '${name}'\n\t\tdataType: ${type}\n`;
  if (format) tableTmdl += `\t\tformatString: ${format}\n`;
  tableTmdl += `\t\tlineageTag: ${lineage()}\n`;
  tableTmdl += `\t\tsummarizeBy: ${summary}\n`;
  tableTmdl += `\t\tsourceColumn: ${name}\n`;
  if (["make", "model", "productName", "body", "transmission", "state", "color", "interior", "seller"].includes(name)) {
    tableTmdl += "\t\tannotation SummarizationSetBy = Automatic\n";
  }
}
tableTmdl += `\n\tmeasure 'Valid Auction Listings' =\n\t\t\tCALCULATE ( COUNTROWS ( car_prices ), KEEPFILTERS ( car_prices[sellingprice] > 0 ), KEEPFILTERS ( car_prices[mmr] > 0 ) )\n\t\tformatString: #,0\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Gross Auction Value' =\n\t\t\tCALCULATE ( SUM ( car_prices[sellingprice] ), KEEPFILTERS ( car_prices[sellingprice] > 0 ), KEEPFILTERS ( car_prices[mmr] > 0 ) )\n\t\tformatString: $#,0.00;($#,0.00);-\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Average Sale Price' =\n\t\t\tCALCULATE ( AVERAGE ( car_prices[sellingprice] ), KEEPFILTERS ( car_prices[sellingprice] > 0 ), KEEPFILTERS ( car_prices[mmr] > 0 ) )\n\t\tformatString: $#,0.00;($#,0.00);-\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Average MMR' =\n\t\t\tCALCULATE ( AVERAGE ( car_prices[mmr] ), KEEPFILTERS ( car_prices[sellingprice] > 0 ), KEEPFILTERS ( car_prices[mmr] > 0 ) )\n\t\tformatString: $#,0.00;($#,0.00);-\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Average Gap to MMR' = [Average Sale Price] - [Average MMR]\n\t\tformatString: $#,0.00;($#,0.00);-\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Average Gap to MMR %' = DIVIDE ( [Average Gap to MMR], [Average MMR] )\n\t\tformatString: 0.00%;-0.00%;0.00%\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Listings Above MMR' =\n\t\t\tCALCULATE ( [Valid Auction Listings], KEEPFILTERS ( car_prices[sellingprice] > car_prices[mmr] ) )\n\t\tformatString: #,0\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Share Above MMR' = DIVIDE ( [Listings Above MMR], [Valid Auction Listings] )\n\t\tformatString: 0.0%;-0.0%;0.0%\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Product Sales Rank' = RANKX ( ALLSELECTED ( car_prices[productName] ), [Gross Auction Value], , DESC, DENSE )\n\t\tformatString: 0\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Top 10 Product Value' = IF ( [Product Sales Rank] <= 10, [Gross Auction Value] )\n\t\tformatString: $#,0.00;($#,0.00);-\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Make Listing Rank' = RANKX ( ALLSELECTED ( car_prices[make] ), [Valid Auction Listings], , DESC, DENSE )\n\t\tformatString: 0\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tmeasure 'Top 10 Make Listings' = IF ( [Make Listing Rank] <= 10, [Valid Auction Listings] )\n\t\tformatString: #,0\n\t\tlineageTag: ${lineage()}\n`;
tableTmdl += `\n\tpartition car_prices = m\n\t\tmode: import\n\t\tsource =\n`;
const escapedDataFile = dataFile.replaceAll('"', '""');
tableTmdl += `\t\t\tlet\n\t\t\t\tSource = Csv.Document(File.Contents("${escapedDataFile}"), [Delimiter = ",", Columns = 16, Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),\n`;
tableTmdl += `\t\t\t\tHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),\n`;
tableTmdl += `\t\t\t\tTrimmedHeaders = Table.TransformColumnNames(Headers, each Text.Trim(_)),\n`;
tableTmdl += `\t\t\t\tTypes = Table.TransformColumnTypes(TrimmedHeaders, {\n`;
tableTmdl += `\t\t\t\t\t{"year", Int64.Type}, {"make", type text}, {"model", type text}, {"trim", type text}, {"body", type text},\n`;
tableTmdl += `\t\t\t\t\t{"transmission", type text}, {"vin", type text}, {"state", type text}, {"condition", type number}, {"odometer", type number},\n`;
tableTmdl += `\t\t\t\t\t{"color", type text}, {"interior", type text}, {"seller", type text}, {"mmr", type number}, {"sellingprice", type number}, {"saledate", type text}\n\t\t\t\t}, "en-US"),\n`;
tableTmdl += `\t\t\t\tWithProductName = Table.AddColumn(Types, "productName", each Text.Trim(Text.Combine(List.RemoveNulls({[make], [model]}), " ")), type text),\n`;
tableTmdl += `\t\t\t\tWithAuctionDate = Table.AddColumn(WithProductName, "auctionDate", each try Date.FromText(Text.Range(Text.Trim([saledate]), 4, 11), [Culture = "en-US"]) otherwise null, type date)\n`;
tableTmdl += `\t\t\tin\n\t\t\t\tWithAuctionDate\n`;
fs.mkdirSync(tablesDir, { recursive: true });
fs.writeFileSync(path.join(tablesDir, "car_prices.tmdl"), tableTmdl, "utf8");

writeJson(path.join(root, `${project}.pbix`), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
  version: "1.0",
  artifacts: [{ report: { path: `${project}.Report` } }],
  settings: { enableAutoRecovery: true }
});
writeJson(path.join(modelDir, "definition.pbism"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  version: "4.2",
  settings: {}
});
writeJson(path.join(modelDir, ".platform"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  metadata: { type: "SemanticModel", displayName: project },
  config: { version: "2.0", logicalId: lineage() }
});
fs.writeFileSync(path.join(modelDefinition, "database.tmdl"), "database\n\tcompatibilityLevel: 1600\n", "utf8");
fs.writeFileSync(path.join(modelDefinition, "model.tmdl"),
  `model Model\n\tculture: en-US\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: en-US\n\tdataAccessOptions\n\t\tlegacyRedirects\n\t\treturnErrorValuesAsNull\n\nref table car_prices\nref table _Measures\n`, "utf8");
fs.writeFileSync(path.join(modelDefinition, "expressions.tmdl"), "", "utf8");
fs.writeFileSync(path.join(modelDefinition, "relationships.tmdl"), "", "utf8");
fs.writeFileSync(path.join(tablesDir, "_Measures.tmdl"),
  `table _Measures\n\tlineageTag: ${lineage()}\n\n\tcolumn placeholder\n\t\tdataType: string\n\t\tlineageTag: ${lineage()}\n\t\tsummarizeBy: none\n\t\tsourceColumn: placeholder\n\t\tisHidden\n\n\tpartition _Measures = calculated\n\t\tmode: import\n\t\tsource = ROW ( "placeholder", BLANK () )\n`, "utf8");

writeJson(path.join(reportDir, "definition.pbir"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  version: "4.0",
  datasetReference: { byPath: { path: `../${project}.SemanticModel` } }
});
writeJson(path.join(reportDefinition, "version.json"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
  version: "4.0"
});
writeJson(path.join(reportDefinition, "report.json"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.2.0/schema.json",
  themeCollection: {
    baseTheme: {
      name: "CY24SU10",
      reportVersionAtImport: { visual: "1.8.95", report: "2.0.95", page: "1.3.95" },
      type: "SharedResources"
    },
    customTheme: {
      name: "Vehicle_Auction_Theme.json",
      reportVersionAtImport: { visual: "2.7.0", report: "3.2.0", page: "2.3.1" },
      type: "RegisteredResources"
    }
  },
  objects: {},
  resourcePackages: [{
    name: "RegisteredResources",
    type: "RegisteredResources",
    items: [{
      name: "Vehicle_Auction_Theme.json",
      path: "Vehicle_Auction_Theme.json",
      type: "CustomTheme"
    }]
  }],
  settings: {
    useStylableVisualContainerHeader: true,
    exportDataMode: "AllowSummarized",
    defaultDrillFilterOtherVisuals: true,
    allowChangeFilterTypes: true,
    useEnhancedTooltips: true,
    useDefaultAggregateDisplayName: true
  }
});
writeJson(path.join(reportDir, "StaticResources", "RegisteredResources", "Vehicle_Auction_Theme.json"), {
  name: "Vehicle Auction | Clear Market",
  dataColors: ["#137C78", "#4472C4", "#E99842", "#8F73B2", "#5B9BD5", "#70AD85", "#D66D64", "#7E9C9C"],
  background: "#F4F7FA",
  foreground: "#203449",
  tableAccent: "#137C78"
});
writeJson(path.join(pagesDir, "pages.json"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
  pageOrder: [overview, products, regional],
  activePageName: overview
});
writeJson(path.join(root, "vehicle-auction-theme.json"), {
  name: "Vehicle Auction | Clear Market",
  dataColors: ["#137C78", "#4472C4", "#E99842", "#8F73B2", "#5B9BD5", "#70AD85", "#D66D64", "#7E9C9C"],
  background: "#F4F7FA",
  foreground: "#203449",
  tableAccent: "#137C78"
});
writeJson(path.join(reportDir, ".platform"), {
  $schema: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  metadata: { type: "Report", displayName: project },
  config: { version: "2.0", logicalId: lineage() }
});

console.log(`Created ${path.join(root, `${project}.pbix`)}`);
console.log(`Dataset source: ${dataFile}`);
console.log("Open the .pbix file in Power BI Desktop to load the report.");
