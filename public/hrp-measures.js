/* HRP measure details shown in the project (P icon) hover card. Source: HRP V2MOM Tracker
 * (https://gus-apps.internal.salesforce.com/applets/hrpV2momTrackerV2/). Keyed by measure number; add an entry to show more detail. */
(function(){
window.HRP_TRACKER_URL='https://gus-apps.internal.salesforce.com/applets/hrpV2momTrackerV2/';
window.HRP_MEASURES={
  '1.1.1':{title:'HRP (Including GCP) meets all defined goals (including security) on E360 dashboard in FY27',
    scope:['Security bugs','3PP GIA2H','Investigations','Availability','Incidents','Infra Patching'],
    sections:[
      {h:'Security bugs',items:['Track 1 + 3 (Automated Patching) covered by Paved Path','Track 2: reduce surface area with RHEL_9 images by 9/15','Track 5: automated releases for rolling SLA for 3PP / Frontier Strike / FedRAMP (dates per service)']},
      {h:'Dates by service',kv:[['FKP','by x date'],['Mesh','by x date'],['IG','by x date'],['Stride','by x date'],['Cache','by x date'],['Async','by x date'],['GCP','by x date']]}]},
  '1.1.3':{title:'Availability',
    sections:[{h:'Goals',items:['No Sev0s. All Tier 0 and Tier 1 services meet or exceed their Availability SLO','Complete at least one HARR review annually','100% of P0-P1 availability backlogs (identified through HARR, PRBs and chaos tests) are remediated within SLAs','100% of service teams meet PagerDuty on-call readiness criteria: 10 minute response time, 24x7x365, on all Sev0 incidents (including security)']}]}
};
})();
