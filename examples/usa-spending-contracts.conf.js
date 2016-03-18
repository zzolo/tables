/**
 * Configuration for usa spending contract data.  This is mostly a proof of
 * concept and not perfect.
 *
 * Source:
 * https://www.usaspending.gov/DownloadCenter/Pages/dataarchives.aspx
 *
 * Started with the --output-config option
 *
 * Many fields are code fields with embeded descriptions, like N: NO, or
 * 8000: Some thing
 *
 * We break these up and put them into contracts_codes table that
 * can be used as lookup.
 */

// Depdendencies
var Sequelize = require("sequelize");
var _ = require("lodash");

// Break up coded field into code and entry for contracts_codes table.
// CD: Thing
function decode(value, fieldName) {
  var p;
  var c;

  if (fieldName.indexOf("descrip") !== -1) {
    return false;
  }

  if (_.isString(value) && value.indexOf(":") < 8 && value.indexOf(":") > 0) {
    p = value.split(":");
    c = p.shift().trim();
    return {
      code: c,
      coded: {
        field: fieldName,
        code: c,
        description: p.join(":").trim()
      }
    };
  }

  return false;
}

// Confgiruation for Tables
module.exports = {
  id: "usa-spending-contracts",
  inputType: "csv",
  dateFormat: "MM/DD/YYYY",
  datetimeFormat: "MM/DD/YYYY HH:mm:ss a",
  inputOptions: {
    "delimiter": ",",
    "quote": "\"",
    "headers": true,
    "ignoreEmpty": true
  },
  // Custom parsing function.  First object is the parsed data from the
  // autoParser, and the second is the data before that (not raw data,
  // but the raw row from the CSV parser)
  parser: function(parsedData, originalData) {
    var parsed = [];
    var bad = false;

    // Fix a field that uses true/false some reason
    parsedData.contracts.isdotcertifieddisadvantagedbusinessenterprise =
      parsedData.contracts.isdotcertifieddisadvantagedbusinessenterprise === "true" ? "Y" :
      parsedData.contracts.isdotcertifieddisadvantagedbusinessenterprise === "false" ? "N" : null;

    // Try to decouple the coded fields
    _.each(parsedData.contracts, function(value, fieldName) {
      var decoded = decode(value, fieldName);
      if (decoded) {
        parsedData.contracts[fieldName] = decoded.code;

        // Add entry for code.  Note that we need to use the model name which
        // is a camelcase version of the table name.
        parsed.push({ contractsCodes: decoded.coded });
      }
    });

    // Bad data.  These seem to indicate a bad original data that is not
    // parsed correctly.
    if (parsedData.contracts["vendor_state_code"] && parsedData.contracts["vendor_state_code"].length > 4) {
      bad = true;
    }
    if (parsedData.contracts.localgovernmentflag && parsedData.contracts.localgovernmentflag.length > 8) {
      bad = true;
    }
    if (parsedData.contracts.typeofidc && parsedData.contracts.typeofidc.length > 8) {
      bad = true;
    }
    if (!bad) {
      parsed.push(parsedData);
    }

    return parsed;
  },
  models: {
    // This is our custom table for storing codes.
    "contracts_codes": {
      tableName: "contracts_codes",
      underscored: true,
      freezeTableName: true,
      fields: {
        field: {
          name: "field",
          type: new Sequelize.STRING(64)
        },
        code: {
          name: "field",
          type: new Sequelize.STRING(16)
        },
        description: {
          name: "field",
          type: new Sequelize.STRING(256)
        }
      },
      options: {
        indexes: [
          {
            fields: ["field", "code"],
            unique: true
          }
        ]
      }
    },
    // Main table for contracts data
    "contracts": {
      tableName: "contracts",
      underscored: true,
      freezeTableName: true,
      "fields": {
        "primKey": {
          "name": "primKey",
          "type": new Sequelize.INTEGER(),
          "autoIncrement": true,
          "primaryKey": true
        },
        "unique_transaction_id": {
          "input": "unique_transaction_id",
          "name": "unique_transaction_id",
          "type": new Sequelize.STRING({length:64})
        },
        "transaction_status": {
          "input": "transaction_status",
          "name": "transaction_status",
          "type": new Sequelize.STRING({length:12})
        },
        "dollarsobligated": {
          "input": "dollarsobligated",
          "name": "dollarsobligated",
          "type": new Sequelize.FLOAT()
        },
        "baseandexercisedoptionsvalue": {
          "input": "baseandexercisedoptionsvalue",
          "name": "baseandexercisedoptionsvalue",
          "type": new Sequelize.FLOAT()
        },
        "baseandalloptionsvalue": {
          "input": "baseandalloptionsvalue",
          "name": "baseandalloptionsvalue",
          "type": new Sequelize.FLOAT()
        },
        "maj_agency_cat": {
          "input": "maj_agency_cat",
          "name": "maj_agency_cat",
          "type": new Sequelize.STRING({length:74})
        },
        "mod_agency": {
          "input": "mod_agency",
          "name": "mod_agency",
          "type": new Sequelize.STRING({length:96})
        },
        "maj_fund_agency_cat": {
          "input": "maj_fund_agency_cat",
          "name": "maj_fund_agency_cat",
          "type": new Sequelize.STRING({length:94})
        },
        "contractingofficeagencyid": {
          "input": "contractingofficeagencyid",
          "name": "contractingofficeagencyid",
          "type": new Sequelize.STRING({length:96})
        },
        "contractingofficeid": {
          "input": "contractingofficeid",
          "name": "contractingofficeid",
          "type": new Sequelize.STRING({length:110})
        },
        "fundingrequestingagencyid": {
          "input": "fundingrequestingagencyid",
          "name": "fundingrequestingagencyid",
          "type": new Sequelize.STRING({length:100})
        },
        "fundingrequestingofficeid": {
          "input": "fundingrequestingofficeid",
          "name": "fundingrequestingofficeid",
          "type": new Sequelize.STRING({length:102})
        },
        "fundedbyforeignentity": {
          "input": "fundedbyforeignentity",
          "name": "fundedbyforeignentity",
          "type": new Sequelize.STRING({length:28})
        },
        "signeddate": {
          "input": "signeddate",
          "name": "signeddate",
          "type": new Sequelize.DATEONLY()
        },
        "effectivedate": {
          "input": "effectivedate",
          "name": "effectivedate",
          "type": new Sequelize.DATEONLY()
        },
        "currentcompletiondate": {
          "input": "currentcompletiondate",
          "name": "currentcompletiondate",
          "type": new Sequelize.DATEONLY()
        },
        "ultimatecompletiondate": {
          "input": "ultimatecompletiondate",
          "name": "ultimatecompletiondate",
          "type": new Sequelize.DATEONLY()
        },
        "lastdatetoorder": {
          "input": "lastdatetoorder",
          "name": "lastdatetoorder",
          "type": new Sequelize.DATEONLY()
        },
        "contractactiontype": {
          "input": "contractactiontype",
          "name": "contractactiontype",
          "type": new Sequelize.STRING({length:70})
        },
        "reasonformodification": {
          "input": "reasonformodification",
          "name": "reasonformodification",
          "type": new Sequelize.STRING({length:94})
        },
        "typeofcontractpricing": {
          "input": "typeofcontractpricing",
          "name": "typeofcontractpricing",
          "type": new Sequelize.STRING({length:188})
        },
        "priceevaluationpercentdifference": {
          "input": "priceevaluationpercentdifference",
          "name": "priceevaluationpercentdifference",
          "type": new Sequelize.FLOAT()
        },
        "subcontractplan": {
          "input": "subcontractplan",
          "name": "subcontractplan",
          "type": new Sequelize.STRING({length:108})
        },
        "lettercontract": {
          "input": "lettercontract",
          "name": "lettercontract",
          "type": new Sequelize.STRING(8)
        },
        "multiyearcontract": {
          "input": "multiyearcontract",
          "name": "multiyearcontract",
          "type": new Sequelize.STRING(32)
        },
        "performancebasedservicecontract": {
          "input": "performancebasedservicecontract",
          "name": "performancebasedservicecontract",
          "type": new Sequelize.STRING({length:76})
        },
        "majorprogramcode": {
          "input": "majorprogramcode",
          "name": "majorprogramcode",
          "type": new Sequelize.STRING({length:100})
        },
        "contingencyhumanitarianpeacekeepingoperation": {
          "input": "contingencyhumanitarianpeacekeepingoperation",
          "name": "contingencyhumanitarianpeacekeepingoperation",
          "type": new Sequelize.STRING({length:146})
        },
        "contractfinancing": {
          "input": "contractfinancing",
          "name": "contractfinancing",
          "type": new Sequelize.STRING({length:96})
        },
        "costorpricingdata": {
          "input": "costorpricingdata",
          "name": "costorpricingdata",
          "type": new Sequelize.STRING({length:48})
        },
        "costaccountingstandardsclause": {
          "input": "costaccountingstandardsclause",
          "name": "costaccountingstandardsclause",
          "type": new Sequelize.STRING(8)
        },
        "descriptionofcontractrequirement": {
          "input": "descriptionofcontractrequirement",
          "name": "descriptionofcontractrequirement",
          "type": new Sequelize.TEXT()
        },
        "purchasecardaspaymentmethod": {
          "input": "purchasecardaspaymentmethod",
          "name": "purchasecardaspaymentmethod",
          "type": new Sequelize.STRING({length:12})
        },
        "numberofactions": {
          "input": "numberofactions",
          "name": "numberofactions",
          "type": new Sequelize.INTEGER()
        },
        "nationalinterestactioncode": {
          "input": "nationalinterestactioncode",
          "name": "nationalinterestactioncode",
          "type": new Sequelize.STRING(32)
        },
        "progsourceagency": {
          "input": "progsourceagency",
          "name": "progsourceagency",
          "type": new Sequelize.STRING(64)
        },
        "progsourceaccount": {
          "input": "progsourceaccount",
          "name": "progsourceaccount",
          "type": new Sequelize.STRING(64)
        },
        "progsourcesubacct": {
          "input": "progsourcesubacct",
          "name": "progsourcesubacct",
          "type": new Sequelize.STRING(64)
        },
        "account_title": {
          "input": "account_title",
          "name": "account_title",
          "type": new Sequelize.STRING()
        },
        "rec_flag": {
          "input": "rec_flag",
          "name": "rec_flag",
          "type": new Sequelize.STRING()
        },
        "typeofidc": {
          "input": "typeofidc",
          "name": "typeofidc",
          "type": new Sequelize.STRING(8)
        },
        "multipleorsingleawardidc": {
          "input": "multipleorsingleawardidc",
          "name": "multipleorsingleawardidc",
          "type": new Sequelize.STRING({length:34})
        },
        "programacronym": {
          "input": "programacronym",
          "name": "programacronym",
          "type": new Sequelize.STRING({length:48})
        },
        "vendorname": {
          "input": "vendorname",
          "name": "vendorname",
          "type": new Sequelize.STRING({length:140})
        },
        "vendoralternatename": {
          "input": "vendoralternatename",
          "name": "vendoralternatename",
          "type": new Sequelize.STRING({length:108})
        },
        "vendorlegalorganizationname": {
          "input": "vendorlegalorganizationname",
          "name": "vendorlegalorganizationname",
          "type": new Sequelize.STRING({length:138})
        },
        "vendordoingasbusinessname": {
          "input": "vendordoingasbusinessname",
          "name": "vendordoingasbusinessname",
          "type": new Sequelize.STRING({length:108})
        },
        "divisionname": {
          "input": "divisionname",
          "name": "divisionname",
          "type": new Sequelize.STRING(32)
        },
        "divisionnumberorofficecode": {
          "input": "divisionnumberorofficecode",
          "name": "divisionnumberorofficecode",
          "type": new Sequelize.STRING(16)
        },
        "vendorenabled": {
          "input": "vendorenabled",
          "name": "vendorenabled",
          "type": new Sequelize.STRING(16)
        },
        "vendorlocationdisableflag": {
          "input": "vendorlocationdisableflag",
          "name": "vendorlocationdisableflag",
          "type": new Sequelize.STRING(16)
        },
        "ccrexception": {
          "input": "ccrexception",
          "name": "ccrexception",
          "type": new Sequelize.STRING(128)
        },
        "streetaddress": {
          "input": "streetaddress",
          "name": "streetaddress",
          "type": new Sequelize.STRING({length:86})
        },
        "streetaddress2": {
          "input": "streetaddress2",
          "name": "streetaddress2",
          "type": new Sequelize.STRING(128)
        },
        "streetaddress3": {
          "input": "streetaddress3",
          "name": "streetaddress3",
          "type": new Sequelize.STRING(128)
        },
        "city": {
          "input": "city",
          "name": "city",
          "type": new Sequelize.STRING({length:42})
        },
        "state": {
          "input": "state",
          "name": "state",
          "type": new Sequelize.STRING(32)
        },
        "zipcode": {
          "input": "zipcode",
          "name": "zipcode",
          "type": new Sequelize.STRING(32)
        },
        "vendorcountrycode": {
          "input": "vendorcountrycode",
          "name": "vendorcountrycode",
          "type": new Sequelize.STRING({length:58})
        },
        "vendor_state_code": {
          "input": "vendor_state_code",
          "name": "vendor_state_code",
          "type": new Sequelize.STRING({length:4})
        },
        "vendor_cd": {
          "input": "vendor_cd",
          "name": "vendor_cd",
          "type": new Sequelize.STRING()
        },
        "congressionaldistrict": {
          "input": "congressionaldistrict",
          "name": "congressionaldistrict",
          "type": new Sequelize.STRING()
        },
        "vendorsitecode": {
          "input": "vendorsitecode",
          "name": "vendorsitecode",
          "type": new Sequelize.STRING(56)
        },
        "vendoralternatesitecode": {
          "input": "vendoralternatesitecode",
          "name": "vendoralternatesitecode",
          "type": new Sequelize.STRING(64)
        },
        "dunsnumber": {
          "input": "dunsnumber",
          "name": "dunsnumber",
          "type": new Sequelize.STRING(64)
        },
        "parentdunsnumber": {
          "input": "parentdunsnumber",
          "name": "parentdunsnumber",
          "type": new Sequelize.STRING(64)
        },
        "phoneno": {
          "input": "phoneno",
          "name": "phoneno",
          "type": new Sequelize.STRING(64)
        },
        "faxno": {
          "input": "faxno",
          "name": "faxno",
          "type": new Sequelize.STRING(64)
        },
        "registrationdate": {
          "input": "registrationdate",
          "name": "registrationdate",
          "type": new Sequelize.DATEONLY()
        },
        "renewaldate": {
          "input": "renewaldate",
          "name": "renewaldate",
          "type": new Sequelize.DATEONLY()
        },
        "mod_parent": {
          "input": "mod_parent",
          "name": "mod_parent",
          "type": new Sequelize.STRING({length:138})
        },
        "locationcode": {
          "input": "locationcode",
          "name": "locationcode",
          "type": new Sequelize.STRING()
        },
        "statecode": {
          "input": "statecode",
          "name": "statecode",
          "type": new Sequelize.STRING(8)
        },
        "placeofperformancecity": {
          "input": "PlaceofPerformanceCity",
          "name": "placeofperformancecity",
          "type": new Sequelize.STRING({length:42})
        },
        "pop_state_code": {
          "input": "pop_state_code",
          "name": "pop_state_code",
          "type": new Sequelize.STRING({length:48})
        },
        "placeofperformancecountrycode": {
          "input": "placeofperformancecountrycode",
          "name": "placeofperformancecountrycode",
          "type": new Sequelize.STRING({length:58})
        },
        "placeofperformancezipcode": {
          "input": "placeofperformancezipcode",
          "name": "placeofperformancezipcode",
          "type": new Sequelize.STRING(32)
        },
        "pop_cd": {
          "input": "pop_cd",
          "name": "pop_cd",
          "type": new Sequelize.STRING({length:8})
        },
        "placeofperformancecongressionaldistrict": {
          "input": "placeofperformancecongressionaldistrict",
          "name": "placeofperformancecongressionaldistrict",
          "type": new Sequelize.STRING({length:8})
        },
        "psc_cat": {
          "input": "psc_cat",
          "name": "psc_cat",
          "type": new Sequelize.STRING({length:4})
        },
        "productorservicecode": {
          "input": "productorservicecode",
          "name": "productorservicecode",
          "type": new Sequelize.STRING({length:212})
        },
        "systemequipmentcode": {
          "input": "systemequipmentcode",
          "name": "systemequipmentcode",
          "type": new Sequelize.STRING(8)
        },
        "claimantprogramcode": {
          "input": "claimantprogramcode",
          "name": "claimantprogramcode",
          "type": new Sequelize.STRING(8)
        },
        "principalnaicscode": {
          "input": "principalnaicscode",
          "name": "principalnaicscode",
          "type": new Sequelize.STRING({length:230})
        },
        "informationtechnologycommercialitemcategory": {
          "input": "informationtechnologycommercialitemcategory",
          "name": "informationtechnologycommercialitemcategory",
          "type": new Sequelize.STRING(32)
        },
        "gfe_gfp": {
          "input": "gfe_gfp",
          "name": "gfe_gfp",
          "type": new Sequelize.STRING({length:70})
        },
        "useofepadesignatedproducts": {
          "input": "useofepadesignatedproducts",
          "name": "useofepadesignatedproducts",
          "type": new Sequelize.STRING({length:48})
        },
        "recoveredmaterialclauses": {
          "input": "recoveredmaterialclauses",
          "name": "recoveredmaterialclauses",
          "type": new Sequelize.STRING({length:106})
        },
        "seatransportation": {
          "input": "seatransportation",
          "name": "seatransportation",
          "type": new Sequelize.STRING(8)
        },
        "contractbundling": {
          "input": "contractbundling",
          "name": "contractbundling",
          "type": new Sequelize.STRING({length:56})
        },
        "consolidatedcontract": {
          "input": "consolidatedcontract",
          "name": "consolidatedcontract",
          "type": new Sequelize.STRING({length:10})
        },
        "countryoforigin": {
          "input": "countryoforigin",
          "name": "countryoforigin",
          "type": new Sequelize.STRING({length:6})
        },
        "placeofmanufacture": {
          "input": "placeofmanufacture",
          "name": "placeofmanufacture",
          "type": new Sequelize.STRING({length:110})
        },
        "manufacturingorganizationtype": {
          "input": "manufacturingorganizationtype",
          "name": "manufacturingorganizationtype",
          "type": new Sequelize.STRING({length:108})
        },
        "agencyid": {
          "input": "agencyid",
          "name": "agencyid",
          "type": new Sequelize.STRING({length:96})
        },
        "piid": {
          "input": "piid",
          "name": "piid",
          "type": new Sequelize.STRING({length:44})
        },
        "modnumber": {
          "input": "modnumber",
          "name": "modnumber",
          "type": new Sequelize.STRING(64)
        },
        "transactionnumber": {
          "input": "transactionnumber",
          "name": "transactionnumber",
          "type": new Sequelize.STRING(64)
        },
        "fiscal_year": {
          "input": "fiscal_year",
          "name": "fiscal_year",
          "type": new Sequelize.INTEGER()
        },
        "idvagencyid": {
          "input": "idvagencyid",
          "name": "idvagencyid",
          "type": new Sequelize.STRING(64)
        },
        "idvpiid": {
          "input": "idvpiid",
          "name": "idvpiid",
          "type": new Sequelize.STRING({length:36})
        },
        "idvmodificationnumber": {
          "input": "idvmodificationnumber",
          "name": "idvmodificationnumber",
          "type": new Sequelize.STRING(64)
        },
        "solicitationid": {
          "input": "solicitationid",
          "name": "solicitationid",
          "type": new Sequelize.STRING({length:48})
        },
        "extentcompeted": {
          "input": "extentcompeted",
          "name": "extentcompeted",
          "type": new Sequelize.STRING({length:110})
        },
        "reasonnotcompeted": {
          "input": "reasonnotcompeted",
          "name": "reasonnotcompeted",
          "type": new Sequelize.STRING({length:58})
        },
        "numberofoffersreceived": {
          "input": "numberofoffersreceived",
          "name": "numberofoffersreceived",
          "type": new Sequelize.INTEGER()
        },
        "commercialitemacquisitionprocedures": {
          "input": "commercialitemacquisitionprocedures",
          "name": "commercialitemacquisitionprocedures",
          "type": new Sequelize.STRING({length:4})
        },
        "commercialitemtestprogram": {
          "input": "commercialitemtestprogram",
          "name": "commercialitemtestprogram",
          "type": new Sequelize.STRING({length:12})
        },
        "smallbusinesscompetitivenessdemonstrationprogram": {
          "input": "smallbusinesscompetitivenessdemonstrationprogram",
          "name": "smallbusinesscompetitivenessdemonstrationprogram",
          "type": new Sequelize.STRING({length:10})
        },
        "a76action": {
          "input": "a76action",
          "name": "a76action",
          "type": new Sequelize.STRING({length:6})
        },
        "competitiveprocedures": {
          "input": "competitiveprocedures",
          "name": "competitiveprocedures",
          "type": new Sequelize.STRING()
        },
        "solicitationprocedures": {
          "input": "solicitationprocedures",
          "name": "solicitationprocedures",
          "type": new Sequelize.STRING({length:96})
        },
        "typeofsetaside": {
          "input": "typeofsetaside",
          "name": "typeofsetaside",
          "type": new Sequelize.STRING({length:128})
        },
        "localareasetaside": {
          "input": "localareasetaside",
          "name": "localareasetaside",
          "type": new Sequelize.STRING(8)
        },
        "evaluatedpreference": {
          "input": "evaluatedpreference",
          "name": "evaluatedpreference",
          "type": new Sequelize.STRING({length:48})
        },
        "fedbizopps": {
          "input": "fedbizopps",
          "name": "fedbizopps",
          "type": new Sequelize.STRING(8)
        },
        "research": {
          "input": "research",
          "name": "research",
          "type": new Sequelize.STRING()
        },
        "statutoryexceptiontofairopportunity": {
          "input": "statutoryexceptiontofairopportunity",
          "name": "statutoryexceptiontofairopportunity",
          "type": new Sequelize.STRING({length:8})
        },
        "organizationaltype": {
          "input": "organizationaltype",
          "name": "organizationaltype",
          "type": new Sequelize.STRING({length:48})
        },
        "numberofemployees": {
          "input": "numberofemployees",
          "name": "numberofemployees",
          "type": new Sequelize.BIGINT()
        },
        "annualrevenue": {
          "input": "annualrevenue",
          "name": "annualrevenue",
          "type": new Sequelize.BIGINT()
        },
        "firm8aflag": {
          "input": "firm8aflag",
          "name": "firm8aflag",
          "type": new Sequelize.STRING(8)
        },
        "hubzoneflag": {
          "input": "hubzoneflag",
          "name": "hubzoneflag",
          "type": new Sequelize.STRING(8)
        },
        "sdbflag": {
          "input": "sdbflag",
          "name": "sdbflag",
          "type": new Sequelize.STRING(8)
        },
        "issbacertifiedsmalldisadvantagedbusiness": {
          "input": "issbacertifiedsmalldisadvantagedbusiness",
          "name": "issbacertifiedsmalldisadvantagedbusiness",
          "type": new Sequelize.STRING(8)
        },
        "shelteredworkshopflag": {
          "input": "shelteredworkshopflag",
          "name": "shelteredworkshopflag",
          "type": new Sequelize.STRING(8)
        },
        "hbcuflag": {
          "input": "hbcuflag",
          "name": "hbcuflag",
          "type": new Sequelize.STRING(8)
        },
        "educationalinstitutionflag": {
          "input": "educationalinstitutionflag",
          "name": "educationalinstitutionflag",
          "type": new Sequelize.STRING(8)
        },
        "womenownedflag": {
          "input": "womenownedflag",
          "name": "womenownedflag",
          "type": new Sequelize.STRING(8)
        },
        "veteranownedflag": {
          "input": "veteranownedflag",
          "name": "veteranownedflag",
          "type": new Sequelize.STRING(8)
        },
        "srdvobflag": {
          "input": "srdvobflag",
          "name": "srdvobflag",
          "type": new Sequelize.STRING(8)
        },
        "localgovernmentflag": {
          "input": "localgovernmentflag",
          "name": "localgovernmentflag",
          "type": new Sequelize.STRING(8)
        },
        "minorityinstitutionflag": {
          "input": "minorityinstitutionflag",
          "name": "minorityinstitutionflag",
          "type": new Sequelize.STRING(8)
        },
        "aiobflag": {
          "input": "aiobflag",
          "name": "aiobflag",
          "type": new Sequelize.STRING(8)
        },
        "stategovernmentflag": {
          "input": "stategovernmentflag",
          "name": "stategovernmentflag",
          "type": new Sequelize.STRING(8)
        },
        "federalgovernmentflag": {
          "input": "federalgovernmentflag",
          "name": "federalgovernmentflag",
          "type": new Sequelize.STRING(8)
        },
        "minorityownedbusinessflag": {
          "input": "minorityownedbusinessflag",
          "name": "minorityownedbusinessflag",
          "type": new Sequelize.STRING(8)
        },
        "apaobflag": {
          "input": "apaobflag",
          "name": "apaobflag",
          "type": new Sequelize.STRING(8)
        },
        "tribalgovernmentflag": {
          "input": "tribalgovernmentflag",
          "name": "tribalgovernmentflag",
          "type": new Sequelize.STRING(8)
        },
        "baobflag": {
          "input": "baobflag",
          "name": "baobflag",
          "type": new Sequelize.STRING(8)
        },
        "naobflag": {
          "input": "naobflag",
          "name": "naobflag",
          "type": new Sequelize.STRING(8)
        },
        "saaobflag": {
          "input": "saaobflag",
          "name": "saaobflag",
          "type": new Sequelize.STRING(8)
        },
        "nonprofitorganizationflag": {
          "input": "nonprofitorganizationflag",
          "name": "nonprofitorganizationflag",
          "type": new Sequelize.STRING(8)
        },
        "isothernotforprofitorganization": {
          "input": "isothernotforprofitorganization",
          "name": "isothernotforprofitorganization",
          "type": new Sequelize.STRING(8)
        },
        "isforprofitorganization": {
          "input": "isforprofitorganization",
          "name": "isforprofitorganization",
          "type": new Sequelize.STRING(8)
        },
        "isfoundation": {
          "input": "isfoundation",
          "name": "isfoundation",
          "type": new Sequelize.STRING(8)
        },
        "haobflag": {
          "input": "haobflag",
          "name": "haobflag",
          "type": new Sequelize.STRING(8)
        },
        "ishispanicservicinginstitution": {
          "input": "ishispanicservicinginstitution",
          "name": "ishispanicservicinginstitution",
          "type": new Sequelize.STRING(8)
        },
        "emergingsmallbusinessflag": {
          "input": "emergingsmallbusinessflag",
          "name": "emergingsmallbusinessflag",
          "type": new Sequelize.STRING(8)
        },
        "hospitalflag": {
          "input": "hospitalflag",
          "name": "hospitalflag",
          "type": new Sequelize.STRING(8)
        },
        "contractingofficerbusinesssizedetermination": {
          "input": "contractingofficerbusinesssizedetermination",
          "name": "contractingofficerbusinesssizedetermination",
          "type": new Sequelize.STRING({length:56})
        },
        "is1862landgrantcollege": {
          "input": "is1862landgrantcollege",
          "name": "is1862landgrantcollege",
          "type": new Sequelize.STRING(8)
        },
        "is1890landgrantcollege": {
          "input": "is1890landgrantcollege",
          "name": "is1890landgrantcollege",
          "type": new Sequelize.STRING(8)
        },
        "is1994landgrantcollege": {
          "input": "is1994landgrantcollege",
          "name": "is1994landgrantcollege",
          "type": new Sequelize.STRING(8)
        },
        "isveterinarycollege": {
          "input": "isveterinarycollege",
          "name": "isveterinarycollege",
          "type": new Sequelize.STRING(8)
        },
        "isveterinaryhospital": {
          "input": "isveterinaryhospital",
          "name": "isveterinaryhospital",
          "type": new Sequelize.STRING(8)
        },
        "isprivateuniversityorcollege": {
          "input": "isprivateuniversityorcollege",
          "name": "isprivateuniversityorcollege",
          "type": new Sequelize.STRING(8)
        },
        "isschoolofforestry": {
          "input": "isschoolofforestry",
          "name": "isschoolofforestry",
          "type": new Sequelize.STRING(8)
        },
        "isstatecontrolledinstitutionofhigherlearning": {
          "input": "isstatecontrolledinstitutionofhigherlearning",
          "name": "isstatecontrolledinstitutionofhigherlearning",
          "type": new Sequelize.STRING(8)
        },
        "isserviceprovider": {
          "input": "isserviceprovider",
          "name": "isserviceprovider",
          "type": new Sequelize.STRING(16)
        },
        "receivescontracts": {
          "input": "receivescontracts",
          "name": "receivescontracts",
          "type": new Sequelize.STRING(8)
        },
        "receivesgrants": {
          "input": "receivesgrants",
          "name": "receivesgrants",
          "type": new Sequelize.STRING(8)
        },
        "receivescontractsandgrants": {
          "input": "receivescontractsandgrants",
          "name": "receivescontractsandgrants",
          "type": new Sequelize.STRING(8)
        },
        "isairportauthority": {
          "input": "isairportauthority",
          "name": "isairportauthority",
          "type": new Sequelize.STRING(8)
        },
        "iscouncilofgovernments": {
          "input": "iscouncilofgovernments",
          "name": "iscouncilofgovernments",
          "type": new Sequelize.STRING(8)
        },
        "ishousingauthoritiespublicortribal": {
          "input": "ishousingauthoritiespublicortribal",
          "name": "ishousingauthoritiespublicortribal",
          "type": new Sequelize.STRING(8)
        },
        "isinterstateentity": {
          "input": "isinterstateentity",
          "name": "isinterstateentity",
          "type": new Sequelize.STRING(8)
        },
        "isplanningcommission": {
          "input": "isplanningcommission",
          "name": "isplanningcommission",
          "type": new Sequelize.STRING(8)
        },
        "isportauthority": {
          "input": "isportauthority",
          "name": "isportauthority",
          "type": new Sequelize.STRING(8)
        },
        "istransitauthority": {
          "input": "istransitauthority",
          "name": "istransitauthority",
          "type": new Sequelize.STRING(8)
        },
        "issubchapterscorporation": {
          "input": "issubchapterscorporation",
          "name": "issubchapterscorporation",
          "type": new Sequelize.STRING(8)
        },
        "islimitedliabilitycorporation": {
          "input": "islimitedliabilitycorporation",
          "name": "islimitedliabilitycorporation",
          "type": new Sequelize.STRING(8)
        },
        "isforeignownedandlocated": {
          "input": "isforeignownedandlocated",
          "name": "isforeignownedandlocated",
          "type": new Sequelize.STRING(8)
        },
        "isarchitectureandengineering": {
          "input": "isarchitectureandengineering",
          "name": "isarchitectureandengineering",
          "type": new Sequelize.STRING(8)
        },
        "isdotcertifieddisadvantagedbusinessenterprise": {
          "input": "isdotcertifieddisadvantagedbusinessenterprise",
          "name": "isdotcertifieddisadvantagedbusinessenterprise",
          "type": new Sequelize.STRING(2)
        },
        "iscitylocalgovernment": {
          "input": "iscitylocalgovernment",
          "name": "iscitylocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "iscommunitydevelopedcorporationownedfirm": {
          "input": "iscommunitydevelopedcorporationownedfirm",
          "name": "iscommunitydevelopedcorporationownedfirm",
          "type": new Sequelize.STRING(8)
        },
        "iscommunitydevelopmentcorporation": {
          "input": "iscommunitydevelopmentcorporation",
          "name": "iscommunitydevelopmentcorporation",
          "type": new Sequelize.STRING(8)
        },
        "isconstructionfirm": {
          "input": "isconstructionfirm",
          "name": "isconstructionfirm",
          "type": new Sequelize.STRING(8)
        },
        "ismanufacturerofgoods": {
          "input": "ismanufacturerofgoods",
          "name": "ismanufacturerofgoods",
          "type": new Sequelize.STRING(8)
        },
        "iscorporateentitynottaxexempt": {
          "input": "iscorporateentitynottaxexempt",
          "name": "iscorporateentitynottaxexempt",
          "type": new Sequelize.STRING(8)
        },
        "iscountylocalgovernment": {
          "input": "iscountylocalgovernment",
          "name": "iscountylocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "isdomesticshelter": {
          "input": "isdomesticshelter",
          "name": "isdomesticshelter",
          "type": new Sequelize.STRING(8)
        },
        "isfederalgovernmentagency": {
          "input": "isfederalgovernmentagency",
          "name": "isfederalgovernmentagency",
          "type": new Sequelize.STRING(8)
        },
        "isfederallyfundedresearchanddevelopmentcorp": {
          "input": "isfederallyfundedresearchanddevelopmentcorp",
          "name": "isfederallyfundedresearchanddevelopmentcorp",
          "type": new Sequelize.STRING(8)
        },
        "isforeigngovernment": {
          "input": "isforeigngovernment",
          "name": "isforeigngovernment",
          "type": new Sequelize.STRING(8)
        },
        "isindiantribe": {
          "input": "isindiantribe",
          "name": "isindiantribe",
          "type": new Sequelize.STRING(8)
        },
        "isintermunicipallocalgovernment": {
          "input": "isintermunicipallocalgovernment",
          "name": "isintermunicipallocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "isinternationalorganization": {
          "input": "isinternationalorganization",
          "name": "isinternationalorganization",
          "type": new Sequelize.STRING(8)
        },
        "islaborsurplusareafirm": {
          "input": "islaborsurplusareafirm",
          "name": "islaborsurplusareafirm",
          "type": new Sequelize.STRING(8)
        },
        "islocalgovernmentowned": {
          "input": "islocalgovernmentowned",
          "name": "islocalgovernmentowned",
          "type": new Sequelize.STRING(8)
        },
        "ismunicipalitylocalgovernment": {
          "input": "ismunicipalitylocalgovernment",
          "name": "ismunicipalitylocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "isnativehawaiianownedorganizationorfirm": {
          "input": "isnativehawaiianownedorganizationorfirm",
          "name": "isnativehawaiianownedorganizationorfirm",
          "type": new Sequelize.STRING(8)
        },
        "isotherbusinessororganization": {
          "input": "isotherbusinessororganization",
          "name": "isotherbusinessororganization",
          "type": new Sequelize.STRING(8)
        },
        "isotherminorityowned": {
          "input": "isotherminorityowned",
          "name": "isotherminorityowned",
          "type": new Sequelize.STRING(8)
        },
        "ispartnershiporlimitedliabilitypartnership": {
          "input": "ispartnershiporlimitedliabilitypartnership",
          "name": "ispartnershiporlimitedliabilitypartnership",
          "type": new Sequelize.STRING(8)
        },
        "isschooldistrictlocalgovernment": {
          "input": "isschooldistrictlocalgovernment",
          "name": "isschooldistrictlocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "issmallagriculturalcooperative": {
          "input": "issmallagriculturalcooperative",
          "name": "issmallagriculturalcooperative",
          "type": new Sequelize.STRING(8)
        },
        "issoleproprietorship": {
          "input": "issoleproprietorship",
          "name": "issoleproprietorship",
          "type": new Sequelize.STRING(8)
        },
        "istownshiplocalgovernment": {
          "input": "istownshiplocalgovernment",
          "name": "istownshiplocalgovernment",
          "type": new Sequelize.STRING(8)
        },
        "istriballyownedfirm": {
          "input": "istriballyownedfirm",
          "name": "istriballyownedfirm",
          "type": new Sequelize.STRING(8)
        },
        "istribalcollege": {
          "input": "istribalcollege",
          "name": "istribalcollege",
          "type": new Sequelize.STRING(8)
        },
        "isalaskannativeownedcorporationorfirm": {
          "input": "isalaskannativeownedcorporationorfirm",
          "name": "isalaskannativeownedcorporationorfirm",
          "type": new Sequelize.STRING(8)
        },
        "iscorporateentitytaxexempt": {
          "input": "iscorporateentitytaxexempt",
          "name": "iscorporateentitytaxexempt",
          "type": new Sequelize.STRING(8)
        },
        "iswomenownedsmallbusiness": {
          "input": "iswomenownedsmallbusiness",
          "name": "iswomenownedsmallbusiness",
          "type": new Sequelize.STRING(8)
        },
        "isecondisadvwomenownedsmallbusiness": {
          "input": "isecondisadvwomenownedsmallbusiness",
          "name": "isecondisadvwomenownedsmallbusiness",
          "type": new Sequelize.STRING(8)
        },
        "isjointventurewomenownedsmallbusiness": {
          "input": "isjointventurewomenownedsmallbusiness",
          "name": "isjointventurewomenownedsmallbusiness",
          "type": new Sequelize.STRING(8)
        },
        "isjointventureecondisadvwomenownedsmallbusiness": {
          "input": "isjointventureecondisadvwomenownedsmallbusiness",
          "name": "isjointventureecondisadvwomenownedsmallbusiness",
          "type": new Sequelize.STRING(8)
        },
        "walshhealyact": {
          "input": "walshhealyact",
          "name": "walshhealyact",
          "type": new Sequelize.STRING({length:34})
        },
        "servicecontractact": {
          "input": "servicecontractact",
          "name": "servicecontractact",
          "type": new Sequelize.STRING({length:34})
        },
        "davisbaconact": {
          "input": "davisbaconact",
          "name": "davisbaconact",
          "type": new Sequelize.STRING({length:34})
        },
        "clingercohenact": {
          "input": "clingercohenact",
          "name": "clingercohenact",
          "type": new Sequelize.STRING({length:12})
        },
        "otherstatutoryauthority": {
          "input": "otherstatutoryauthority",
          "name": "otherstatutoryauthority",
          "type": new Sequelize.STRING({length:20})
        },
        "prime_awardee_executive1": {
          "input": "prime_awardee_executive1",
          "name": "prime_awardee_executive1",
          "type": new Sequelize.STRING(128)
        },
        "prime_awardee_executive1_compensation": {
          "input": "prime_awardee_executive1_compensation",
          "name": "prime_awardee_executive1_compensation",
          "type": new Sequelize.FLOAT()
        },
        "prime_awardee_executive2": {
          "input": "prime_awardee_executive2",
          "name": "prime_awardee_executive2",
          "type": new Sequelize.STRING(128)
        },
        "prime_awardee_executive2_compensation": {
          "input": "prime_awardee_executive2_compensation",
          "name": "prime_awardee_executive2_compensation",
          "type": new Sequelize.FLOAT()
        },
        "prime_awardee_executive3": {
          "input": "prime_awardee_executive3",
          "name": "prime_awardee_executive3",
          "type": new Sequelize.STRING(128)
        },
        "prime_awardee_executive3_compensation": {
          "input": "prime_awardee_executive3_compensation",
          "name": "prime_awardee_executive3_compensation",
          "type": new Sequelize.FLOAT()
        },
        "prime_awardee_executive4": {
          "input": "prime_awardee_executive4",
          "name": "prime_awardee_executive4",
          "type": new Sequelize.STRING(128)
        },
        "prime_awardee_executive4_compensation": {
          "input": "prime_awardee_executive4_compensation",
          "name": "prime_awardee_executive4_compensation",
          "type": new Sequelize.FLOAT()
        },
        "prime_awardee_executive5": {
          "input": "prime_awardee_executive5",
          "name": "prime_awardee_executive5",
          "type": new Sequelize.STRING(128)
        },
        "prime_awardee_executive5_compensation": {
          "input": "prime_awardee_executive5_compensation",
          "name": "prime_awardee_executive5_compensation",
          "type": new Sequelize.FLOAT()
        },
        "interagencycontractingauthority": {
          "input": "interagencycontractingauthority",
          "name": "interagencycontractingauthority",
          "type": new Sequelize.STRING(64)
        },
        "last_modified_date": {
          "input": "last_modified_date",
          "name": "last_modified_date",
          "type": new Sequelize.DATEONLY()
        }
      },
      "options": {
        "indexes": [
          {
            "fields": [
              "unique_transaction_id"
            ],
            unique: true
          }
        ]
      }
    }
  }
};
