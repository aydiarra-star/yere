import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch } from "./supabaseAuth";

export type AtelierTaskStatus = "a_faire" | "en_cours" | "bloquee" | "terminee";
export type AtelierTask = {
  id: string;
  atelierId: string;
  orderId: string;
  title: string;
  description: string;
  status: AtelierTaskStatus;
  assigneeId: string | null;
  order: number;
  progressNote: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  history: AtelierTaskHistory[];
};
export type AtelierTaskHistory = {
  id: number;
  actorId: string | null;
  event: "creation" | "attribution" | "changement_statut" | "note_avancement";
  oldStatus: AtelierTaskStatus | null;
  newStatus: AtelierTaskStatus | null;
  oldAssigneeId: string | null;
  newAssigneeId: string | null;
  note: string | null;
  createdAt: string;
};
type TaskRow = {
  id:string; atelier_id:string; commande_id:string; titre:string; description:string|null;
  statut:AtelierTaskStatus; assigne_a:string|null; ordre:number; note_avancement:string|null;
  created_by:string; created_at:string; updated_at:string; started_at:string|null; completed_at:string|null;
};
type HistoryRow = {
  id:number; tache_id:string; acteur_id:string|null; evenement:AtelierTaskHistory["event"];
  ancien_statut:AtelierTaskStatus|null; nouveau_statut:AtelierTaskStatus|null;
  ancienne_attribution:string|null; nouvelle_attribution:string|null; note:string|null; created_at:string;
};

async function parse(response:Response):Promise<unknown>{
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const e=body as Record<string,unknown>;throw new Error(String(e.message??e.details??e.hint??e.error??`Erreur serveur (${response.status})`));}
  return body;
}

export async function listAtelierTasks(session:YereSession,atelierId:string):Promise<AtelierTask[]>{
  const filter=encodeURIComponent(atelierId);
  const response=await authenticatedFetch(session,`rest/v1/commande_tache?select=id,atelier_id,commande_id,titre,description,statut,assigne_a,ordre,note_avancement,created_by,created_at,updated_at,started_at,completed_at&atelier_id=eq.${filter}&order=ordre.asc,created_at.asc`);
  const data=await parse(response);
  if(!Array.isArray(data))throw new Error("Réponse des tâches invalide.");
  const rows=data as TaskRow[];
  if(rows.length===0)return [];
  const ids=rows.map(row=>row.id);
  const historyResponse=await authenticatedFetch(session,`rest/v1/commande_tache_historique?select=id,tache_id,acteur_id,evenement,ancien_statut,nouveau_statut,ancienne_attribution,nouvelle_attribution,note,created_at&tache_id=in.(${ids.map(encodeURIComponent).join(",")})&order=created_at.desc`);
  const historyData=await parse(historyResponse);
  if(!Array.isArray(historyData))throw new Error("Réponse de l’historique des tâches invalide.");
  const byTask=new Map<string,AtelierTaskHistory[]>();
  for(const row of historyData as HistoryRow[]){
    const list=byTask.get(row.tache_id)??[];
    list.push({id:row.id,actorId:row.acteur_id,event:row.evenement,oldStatus:row.ancien_statut,newStatus:row.nouveau_statut,oldAssigneeId:row.ancienne_attribution,newAssigneeId:row.nouvelle_attribution,note:row.note,createdAt:row.created_at});
    byTask.set(row.tache_id,list);
  }
  return rows.map(row=>({
    id:row.id,atelierId:row.atelier_id,orderId:row.commande_id,title:row.titre,description:row.description??"",
    status:row.statut,assigneeId:row.assigne_a,order:row.ordre,progressNote:row.note_avancement??"",
    createdBy:row.created_by,createdAt:row.created_at,updatedAt:row.updated_at,
    startedAt:row.started_at,completedAt:row.completed_at,history:byTask.get(row.id)??[]
  }));
}

export async function createAtelierTask(session:YereSession,atelierId:string,input:{
  orderId:string;title:string;description:string;assigneeId:string|null;order:number;
}):Promise<void>{
  const response=await authenticatedFetch(session,"rest/v1/commande_tache",{
    method:"POST",headers:{Prefer:"return=minimal"},
    body:JSON.stringify({atelier_id:atelierId,commande_id:input.orderId,titre:input.title.trim(),
      description:input.description.trim()||null,assigne_a:input.assigneeId,ordre:input.order})
  });
  await parse(response);
}

export async function updateAtelierTask(session:YereSession,atelierId:string,taskId:string,patch:{
  status?:AtelierTaskStatus;assigneeId?:string|null;progressNote?:string;
}):Promise<void>{
  const body:Record<string,unknown>={};
  if(patch.status!==undefined)body.statut=patch.status;
  if(patch.assigneeId!==undefined)body.assigne_a=patch.assigneeId;
  if(patch.progressNote!==undefined)body.note_avancement=patch.progressNote;
  const response=await authenticatedFetch(session,`rest/v1/commande_tache?id=eq.${encodeURIComponent(taskId)}&atelier_id=eq.${encodeURIComponent(atelierId)}&select=id`,{
    method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)
  });
  const data=await parse(response);
  if(!Array.isArray(data)||data.length!==1)throw new Error("La mise à jour de la tâche n’a pas été confirmée.");
}
