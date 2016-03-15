# Tables

Tables is a simple command-line tool and powerful library for importing data like a CSV or JSON file into relational tables.  The goal is to make data import easy, configurable, and stable for large datasets into a relational database for better analysis.

## Install

1. To include as a library: `npm install tables`
1. To use as a command-line tool: `npm install -g tables`

## Command line use

Coming soon.

## Library use

Include like most libraries:

```
var Tables = require("tables");
```

Import in a CSV file:

```
var t = new Tables({
  input: "./tests/data/nyc-water-quality-complaints.csv"
});
```

## Tests

Coming soon.


### Data

* Water quality complaints: `wget "https://data.cityofnewyork.us/api/views/qfe3-6dkn/rows.csv?accessType=DOWNLOAD" -O tests/data/nyc-water-quality-complaints.csv`
