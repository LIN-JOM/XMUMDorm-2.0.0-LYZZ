import {useReport,type ReportReason,type ReportState} from '@/features/reports/useReport';

export type CampusReportReason=ReportReason;
export type CampusReportState=ReportState;

/** Campus names remain at the feature boundary; all targets share one server-report state machine. */
export function useCampusReport(target:{id:number;kind:'confession'|'wall'}|null,signedIn:boolean,onAuthFailure:(error:unknown)=>Promise<unknown>){
 return useReport(target?{id:target.id,type:target.kind==='wall'?'confession':'post'}:null,signedIn,onAuthFailure);
}
