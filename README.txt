VEHICLE AUCTION PERFORMANCE — TASK 4

PROJECT FILES

vehicle-auction-dashboard.html
  A standalone, responsive interactive dashboard. Open it in a modern browser,
  select "Load / refresh CSV", and choose the supplied car_prices.csv. Filters
  cross-update all charts. The CSV is processed entirely in your browser and is
  never uploaded. No additional packages or internet connection are required.

Vehicle-Auction-Summary.pptx
  Five-slide presentation with findings calculated from the supplied dataset.

PowerBI-Measures.dax
  Import-ready DAX measures for building the equivalent report in Power BI.

car_prices.csv
  The original dataset supplied for this task. It is not modified by the
  dashboard. In Power BI, import it using Get data > Text/CSV, name the table
  car_prices, and set year, sellingprice, mmr, condition, and odometer to
  numeric types. Add the measures in PowerBI-Measures.dax.

DATA NOTES

The file has 558,837 source rows. There are 558,799 records with both a positive
selling price and a positive MMR value; the dashboard's pricing KPIs use this
valid-price subset. Currency is presented as USD based on the U.S. vehicle
auction data. MMR is the Manheim Market Report benchmark.

The source contains no profit or order-ID columns. "Average Gap to MMR" is
average selling price minus average MMR; it is a valuation benchmark, not profit.
Model year is a vehicle characteristic, not an auction date. Auction-date
coverage is limited and uneven, so the report does not claim year-over-year
sales growth.

The dashboard asks you to select car_prices.csv on first open. This is
intentional: browsers restrict local files, so choosing the file explicitly
allows an offline, private dashboard without a local server.
