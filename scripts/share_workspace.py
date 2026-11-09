#!/usr/bin/env python3
"""Share only CFS journal files with authenticated GUS organization users; dry run unless --apply."""
import argparse,json,os,re,subprocess,urllib.request
from pathlib import Path
TITLE=re.compile(r'^CFSMonthlyReview_v1_(release|epic)_[A-Za-z0-9-]{1,60}$')
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 auth=json.loads(subprocess.check_output(['sf','org','display','--target-org','GusProduction','--json'],env={**os.environ,'SF_DISABLE_LOG_FILE':'true'},text=True))['result']
 host=auth['instanceUrl'].rstrip('/');token=auth['accessToken']
 if not re.fullmatch(r'https://gus\.(?:my\.)?salesforce\.com',host):raise RuntimeError('Unexpected GUS organization host.')
 def call(path,body=None):
  if not path.startswith('/services/data/'):raise RuntimeError('Unexpected Salesforce path.')
  request=urllib.request.Request(host+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode() if body is not None else None)
  with urllib.request.urlopen(request,timeout=60) as response:return json.load(response)
 def query(soql):
  from urllib.parse import urlencode
  page=call('/services/data/v62.0/query?'+urlencode({'q':soql}));rows=page.get('records',[])
  while not page.get('done',True):page=call(page['nextRecordsUrl']);rows.extend(page.get('records',[]))
  return rows
 org=query('SELECT Id FROM Organization LIMIT 1')[0]['Id'];assert re.fullmatch(r'00D[A-Za-z0-9]{15}',org)
 rows=query("SELECT Id, ContentDocumentId, Title FROM ContentVersion WHERE Title LIKE 'CFSMonthlyReview\\_v1\\_%' LIMIT 10001")
 if len(rows)>10000:raise RuntimeError('Migration exceeds its reviewed bound; narrow the scope before proceeding.')
 docs=sorted({r['ContentDocumentId'] for r in rows if TITLE.fullmatch(r['Title'])});assert all(re.fullmatch(r'069[A-Za-z0-9]{15}',d) for d in docs)
 def links():
  result={}
  for start in range(0,len(docs),100):
   ids=','.join("'"+d+"'" for d in docs[start:start+100]);result.update({r['ContentDocumentId']:r for r in query(f"SELECT ContentDocumentId, ShareType, Visibility FROM ContentDocumentLink WHERE LinkedEntityId = '{org}' AND ContentDocumentId IN ({ids})")})
  return result
 existing=links();missing=[d for d in docs if d not in existing];report={'organizationId':org,'journalVersions':len(rows),'documents':len(docs),'alreadyShared':len(existing),'missingLinks':len(missing),'applied':args.apply}
 if args.apply:
  for start in range(0,len(missing),10):
   records=[{'attributes':{'type':'ContentDocumentLink'},'ContentDocumentId':d,'LinkedEntityId':org,'ShareType':'V','Visibility':'AllUsers'} for d in missing[start:start+10]]
   result=call('/services/data/v62.0/composite/sobjects',{'allOrNone':False,'records':records})
   failures=[r for r in result if not r.get('success') and not all(e.get('statusCode')=='DUPLICATE_VALUE' for e in r.get('errors',[]))]
   if failures:
    print(json.dumps({'sharingErrors':[r.get('errors',[]) for r in failures[:2]]},indent=2))
    raise RuntimeError('Some app-only sharing links could not be created. Rerun the dry check; no other files were changed.')
  final=links();report['verifiedShared']=sum(1 for d in docs if d in final and final[d]['ShareType'] in ['V','C'] and final[d]['Visibility']=='AllUsers')
  if report['verifiedShared']!=len(docs):raise RuntimeError('App journal sharing verification is incomplete.')
 (ROOT/'.local').mkdir(exist_ok=True);(ROOT/'.local'/'shared-migration-result.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if __name__=='__main__':main()
