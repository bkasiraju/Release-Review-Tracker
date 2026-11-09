'use strict';
// Verified Salesforce list metadata only; contains no credentials or epic records.
module.exports = [
  {
    "id": "00BEE00000FBFuM2AX",
    "developerName": "MQ_266_Review_Tracker",
    "objectApiName": "ADM_Epic__c",
    "label": "MQ - 266 Review Tracker",
    "query": "SELECT Name, Development_Lead__r.Name, Priority__c, toLabel(Health__c), Epic_Health_Comments__c, Path_to_Green__c, Percent_Of_Work_Items_Complete__c, Planned_Story_Points__c, Actual_Story_Points_on_Epic__c, Storypoints_Closed__c, Storypoints_In_Progress__c, Storypoints_In_Waiting__c, Storypoints_New__c, Id, RecordTypeId, CurrencyIsoCode, CreatedDate, LastModifiedDate, SystemModstamp, Development_Lead__c FROM ADM_Epic__c WHERE Planned_Release__r.Name like '%MQ 266%' ORDER BY Name ASC NULLS FIRST, Id ASC NULLS FIRST",
    "columns": [
      {
        "fieldNameOrPath": "Name",
        "label": "Epic Name",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Development_Lead__r.Name",
        "label": "Development Lead",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Priority__c",
        "label": "Priority",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Health__c",
        "label": "Health",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Epic_Health_Comments__c",
        "label": "Epic Health Comments",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Path_to_Green__c",
        "label": "Path to Green",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Percent_Of_Work_Items_Complete__c",
        "label": "% of Work Items Complete",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Planned_Story_Points__c",
        "label": "Planned Story Points",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Actual_Story_Points_on_Epic__c",
        "label": "Actual Story Points on Epic",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_Closed__c",
        "label": "#Storypoints Closed",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Progress__c",
        "label": "#Storypoints In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Waiting__c",
        "label": "#Storypoints In Waiting",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_New__c",
        "label": "#Storypoints New",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Id",
        "label": "Record ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "RecordTypeId",
        "label": "Record Type ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CurrencyIsoCode",
        "label": "Currency ISO Code",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CreatedDate",
        "label": "Created Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "LastModifiedDate",
        "label": "Last Modified Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "SystemModstamp",
        "label": "System Modstamp",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Development_Lead__c",
        "label": "Development Lead",
        "hidden": true
      }
    ],
    "verifiedAt": "2026-11-02T08:31:33.129073+00:00",
    "digest": "51709a7b3c36a14cecc4332607634f514fe538a1576f22f7ff21035d3513bd40"
  },
  {
    "id": "00BEE00000EzIkj2AF",
    "developerName": "VegaCache_266_Review_Tracker",
    "objectApiName": "ADM_Epic__c",
    "label": "VegaCache - 266 Review Tracker",
    "query": "SELECT Project__r.Name, Name, Priority__c, Development_Lead__r.Name, toLabel(Health__c), Epic_Health_Comments__c, Path_to_Green__c, Percent_Of_Work_Items_Complete__c, Planned_Story_Points__c, Actual_Story_Points_on_Epic__c, Storypoints_Closed__c, Storypoints_In_Progress__c, Storypoints_In_Waiting__c, Storypoints_New__c, Id, RecordTypeId, CurrencyIsoCode, CreatedDate, LastModifiedDate, SystemModstamp, Project__c, Development_Lead__c FROM ADM_Epic__c WHERE Name like '%VegaCache 266%' AND Planned_Release__r.Name like '%VegaCache 266%' ORDER BY Health__c ASC NULLS FIRST, Id ASC NULLS FIRST",
    "columns": [
      {
        "fieldNameOrPath": "Project__r.Name",
        "label": "Project",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Name",
        "label": "Epic Name",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Priority__c",
        "label": "Priority",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Development_Lead__r.Name",
        "label": "Development Lead",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Health__c",
        "label": "Health",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Epic_Health_Comments__c",
        "label": "Epic Health Comments",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Path_to_Green__c",
        "label": "Path to Green",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Percent_Of_Work_Items_Complete__c",
        "label": "% of Work Items Complete",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Planned_Story_Points__c",
        "label": "Planned Story Points",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Actual_Story_Points_on_Epic__c",
        "label": "Actual Story Points on Epic",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_Closed__c",
        "label": "#Storypoints Closed",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Progress__c",
        "label": "#Storypoints In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Waiting__c",
        "label": "#Storypoints In Waiting",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_New__c",
        "label": "#Storypoints New",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Id",
        "label": "Record ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "RecordTypeId",
        "label": "Record Type ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CurrencyIsoCode",
        "label": "Currency ISO Code",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CreatedDate",
        "label": "Created Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "LastModifiedDate",
        "label": "Last Modified Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "SystemModstamp",
        "label": "System Modstamp",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Project__c",
        "label": "Project",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Development_Lead__c",
        "label": "Development Lead",
        "hidden": true
      }
    ],
    "verifiedAt": "2026-11-02T16:45:21.540288+00:00",
    "digest": "8b8dbb42490620409dc3d993c2c241e8eb7615ff5bc91e2dcd9e40dc0f691634"
  },
  {
    "id": "00BEE00000EzMI52AN",
    "developerName": "VegaCache_FACE_R266_Epics",
    "objectApiName": "ADM_Epic__c",
    "label": "VegaCache FACE - R266 Epics",
    "query": "SELECT Project__r.Name, Name, Development_Lead__r.Name, toLabel(Health__c), Priority__c, Epic_Health_Comments__c, Path_to_Green__c, Percent_Of_Work_Items_Complete__c, Planned_Story_Points__c, Actual_Story_Points_on_Epic__c, Storypoints_New__c, Storypoints_In_Progress__c, Storypoints_In_Waiting__c, Storypoints_Closed__c, WorkItems_In_Progress__c, Id, RecordTypeId, CurrencyIsoCode, CreatedDate, LastModifiedDate, SystemModstamp, Project__c, Development_Lead__c FROM ADM_Epic__c WHERE Team__r.Name like '%VegaCache FACE%' AND Name like '%VegaCache FACE%' AND (NOT Health__c like '%Canceled%') ORDER BY Project__r.Name ASC NULLS FIRST, Id ASC NULLS FIRST",
    "columns": [
      {
        "fieldNameOrPath": "Project__r.Name",
        "label": "Project",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Name",
        "label": "Epic Name",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Development_Lead__r.Name",
        "label": "Development Lead",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Health__c",
        "label": "Health",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Priority__c",
        "label": "Priority",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Epic_Health_Comments__c",
        "label": "Epic Health Comments",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Path_to_Green__c",
        "label": "Path to Green",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Percent_Of_Work_Items_Complete__c",
        "label": "% of Work Items Complete",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Planned_Story_Points__c",
        "label": "Planned Story Points",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Actual_Story_Points_on_Epic__c",
        "label": "Actual Story Points on Epic",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_New__c",
        "label": "#Storypoints New",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Progress__c",
        "label": "#Storypoints In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Waiting__c",
        "label": "#Storypoints In Waiting",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_Closed__c",
        "label": "#Storypoints Closed",
        "hidden": false
      },
      {
        "fieldNameOrPath": "WorkItems_In_Progress__c",
        "label": "#WorkItems In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Id",
        "label": "Record ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "RecordTypeId",
        "label": "Record Type ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CurrencyIsoCode",
        "label": "Currency ISO Code",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CreatedDate",
        "label": "Created Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "LastModifiedDate",
        "label": "Last Modified Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "SystemModstamp",
        "label": "System Modstamp",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Project__c",
        "label": "Project",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Development_Lead__c",
        "label": "Development Lead",
        "hidden": true
      }
    ],
    "verifiedAt": "2026-11-02T16:46:25.010621+00:00",
    "digest": "8fffc1021166540827900f1410768a98defeaf1495cfe108e2607cf685226425"
  },
  {
    "id": "00BEE00000EzHAP2A3",
    "developerName": "VegaStore_266_Review_Tracker",
    "objectApiName": "ADM_Epic__c",
    "label": "VegaStore - 266 Review Tracker",
    "query": "SELECT Project__r.Name, Name, Priority__c, Development_Lead__r.Name, toLabel(Health__c), Epic_Health_Comments__c, Path_to_Green__c, Percent_Of_Work_Items_Complete__c, Planned_Story_Points__c, Actual_Story_Points_on_Epic__c, Storypoints_Closed__c, Storypoints_In_Progress__c, Storypoints_In_Waiting__c, Storypoints_New__c, Id, RecordTypeId, CurrencyIsoCode, CreatedDate, LastModifiedDate, SystemModstamp, Project__c, Development_Lead__c FROM ADM_Epic__c WHERE Team__r.Name like '%VegaStore%' AND Planned_Release__r.Name like '%VegaStore 266%' ORDER BY Project__r.Name ASC NULLS FIRST, Id ASC NULLS FIRST",
    "columns": [
      {
        "fieldNameOrPath": "Project__r.Name",
        "label": "Project",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Name",
        "label": "Epic Name",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Priority__c",
        "label": "Priority",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Development_Lead__r.Name",
        "label": "Development Lead",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Health__c",
        "label": "Health",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Epic_Health_Comments__c",
        "label": "Epic Health Comments",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Path_to_Green__c",
        "label": "Path to Green",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Percent_Of_Work_Items_Complete__c",
        "label": "% of Work Items Complete",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Planned_Story_Points__c",
        "label": "Planned Story Points",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Actual_Story_Points_on_Epic__c",
        "label": "Actual Story Points on Epic",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_Closed__c",
        "label": "#Storypoints Closed",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Progress__c",
        "label": "#Storypoints In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Waiting__c",
        "label": "#Storypoints In Waiting",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_New__c",
        "label": "#Storypoints New",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Id",
        "label": "Record ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "RecordTypeId",
        "label": "Record Type ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CurrencyIsoCode",
        "label": "Currency ISO Code",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CreatedDate",
        "label": "Created Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "LastModifiedDate",
        "label": "Last Modified Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "SystemModstamp",
        "label": "System Modstamp",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Project__c",
        "label": "Project",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Development_Lead__c",
        "label": "Development Lead",
        "hidden": true
      }
    ],
    "verifiedAt": "2026-11-02T16:47:15.800168+00:00",
    "digest": "e52d83ecee6a01f61fe8fc205fbf94f48c29fed183447ae8ce782c7c6ae4ab01"
  },
  {
    "id": "00BEE00000F5LWD2A3",
    "developerName": "MAPS_266_Review_Tracker1",
    "objectApiName": "ADM_Epic__c",
    "label": "MAPS - 266 Review Tracker",
    "query": "SELECT Project__r.Name, Name, Development_Lead__r.Name, Priority__c, toLabel(Health__c), Epic_Health_Comments__c, Path_to_Green__c, Percent_Of_Work_Items_Complete__c, Planned_Story_Points__c, Actual_Story_Points_on_Epic__c, Storypoints_Closed__c, Storypoints_In_Progress__c, Storypoints_In_Waiting__c, Storypoints_New__c, Id, RecordTypeId, CurrencyIsoCode, CreatedDate, LastModifiedDate, SystemModstamp, Project__c, Development_Lead__c FROM ADM_Epic__c WHERE Team__r.Name like '%Managed Async Processing Service%' AND Planned_Release__r.Name like '%MAPS 266%' ORDER BY Project__r.Name ASC NULLS FIRST, Id ASC NULLS FIRST",
    "columns": [
      {
        "fieldNameOrPath": "Project__r.Name",
        "label": "Project",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Name",
        "label": "Epic Name",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Development_Lead__r.Name",
        "label": "Development Lead",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Priority__c",
        "label": "Priority",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Health__c",
        "label": "Health",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Epic_Health_Comments__c",
        "label": "Epic Health Comments",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Path_to_Green__c",
        "label": "Path to Green",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Percent_Of_Work_Items_Complete__c",
        "label": "% of Work Items Complete",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Planned_Story_Points__c",
        "label": "Planned Story Points",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Actual_Story_Points_on_Epic__c",
        "label": "Actual Story Points on Epic",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_Closed__c",
        "label": "#Storypoints Closed",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Progress__c",
        "label": "#Storypoints In Progress",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_In_Waiting__c",
        "label": "#Storypoints In Waiting",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Storypoints_New__c",
        "label": "#Storypoints New",
        "hidden": false
      },
      {
        "fieldNameOrPath": "Id",
        "label": "Record ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "RecordTypeId",
        "label": "Record Type ID",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CurrencyIsoCode",
        "label": "Currency ISO Code",
        "hidden": true
      },
      {
        "fieldNameOrPath": "CreatedDate",
        "label": "Created Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "LastModifiedDate",
        "label": "Last Modified Date",
        "hidden": true
      },
      {
        "fieldNameOrPath": "SystemModstamp",
        "label": "System Modstamp",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Project__c",
        "label": "Project",
        "hidden": true
      },
      {
        "fieldNameOrPath": "Development_Lead__c",
        "label": "Development Lead",
        "hidden": true
      }
    ],
    "verifiedAt": "2026-11-09T07:13:31.145570+00:00",
    "digest": "a304da551c3ea3aa7b9b1b1ea74e7e09f227b9f063d82739e5d23c81fca827db"
  }
];
