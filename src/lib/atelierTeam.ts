import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch } from "./supabaseAuth";

export type AtelierMember = {
  atelierId: string;
  userId: string;
  role: "proprietaire" | "gestionnaire" | "employe";
  active: boolean;
  createdAt: string;
};
export type AtelierInvitation = {
  id: string;
  atelierId: string;
  atelierName: string;
  email: string;
  role: "gestionnaire" | "employe";
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
  declinedAt: string | null;
  createdAt: string;
};
type MemberRow = { atelier_id:string; user_id:string; role:string; actif:boolean; created_at:string };
type InvitationRow = { id:string; atelier_id:string; atelier_nom:string; email:string; role:string; expires_at:string; accepted_at:string|null; cancelled_at:string|null; declined_at:string|null; created_at:string };

async function parse(response:Response):Promise<unknown>{
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const e=body as Record<string,unknown>;throw new Error(String(e.message??e.details??e.hint??e.error??`Erreur serveur (${response.status})`));}
  return body;
}
export async function listAtelierMembers(session:YereSession,atelierId:string):Promise<AtelierMember[]>{
  const response=await authenticatedFetch(session,`rest/v1/atelier_membre?select=atelier_id,user_id,role,actif,created_at&atelier_id=eq.${encodeURIComponent(atelierId)}&order=created_at.asc`);
  const data=await parse(response);if(!Array.isArray(data))throw new Error("Réponse équipe invalide.");
  return (data as MemberRow[]).map(row=>({atelierId:row.atelier_id,userId:row.user_id,role:row.role as AtelierMember["role"],active:row.actif,createdAt:row.created_at}));
}
export async function listAtelierInvitations(session:YereSession,atelierId:string):Promise<AtelierInvitation[]>{
  const response=await authenticatedFetch(session,`rest/v1/invitation_atelier?select=id,atelier_id,atelier_nom,email,role,expires_at,accepted_at,cancelled_at,declined_at,created_at&atelier_id=eq.${encodeURIComponent(atelierId)}&order=created_at.desc`);
  const data=await parse(response);if(!Array.isArray(data))throw new Error("Réponse des invitations invalide.");
  return (data as InvitationRow[]).map(row=>({id:row.id,atelierId:row.atelier_id,atelierName:row.atelier_nom,email:row.email,role:row.role as AtelierInvitation["role"],expiresAt:row.expires_at,acceptedAt:row.accepted_at,cancelledAt:row.cancelled_at,declinedAt:row.declined_at,createdAt:row.created_at}));
}
export async function listMyAtelierInvitations(session:YereSession):Promise<AtelierInvitation[]>{
  const response=await authenticatedFetch(session,"rest/v1/invitation_atelier?select=id,atelier_id,atelier_nom,email,role,expires_at,accepted_at,cancelled_at,declined_at,created_at&accepted_at=is.null&cancelled_at=is.null&declined_at=is.null&order=created_at.desc");
  const data=await parse(response);if(!Array.isArray(data))throw new Error("Réponse des invitations reçues invalide.");
  return (data as InvitationRow[]).map(row=>({id:row.id,atelierId:row.atelier_id,atelierName:row.atelier_nom,email:row.email,role:row.role as AtelierInvitation["role"],expiresAt:row.expires_at,acceptedAt:row.accepted_at,cancelledAt:row.cancelled_at,declinedAt:row.declined_at,createdAt:row.created_at}));
}
export async function createAtelierInvitation(session:YereSession,atelierId:string,email:string,role:"gestionnaire"|"employe"):Promise<AtelierInvitation>{
  const response=await authenticatedFetch(session,"rest/v1/rpc/create_atelier_invitation",{method:"POST",body:JSON.stringify({p_atelier_id:atelierId,p_email:email.trim().toLowerCase(),p_role:role})});
  const data=await parse(response);const row=Array.isArray(data)?data[0] as InvitationRow|undefined:undefined;
  if(!row?.id)throw new Error("L’invitation n’a pas été confirmée par le serveur.");
  return {id:row.id,atelierId:row.atelier_id,atelierName:row.atelier_nom,email:row.email,role:row.role as AtelierInvitation["role"],expiresAt:row.expires_at,acceptedAt:row.accepted_at,cancelledAt:row.cancelled_at,declinedAt:row.declined_at ?? null,createdAt:row.created_at};
}
export async function acceptAtelierInvitation(session:YereSession,invitationId:string):Promise<string>{
  const data=await parse(await authenticatedFetch(session,"rest/v1/rpc/accept_atelier_invitation",{method:"POST",body:JSON.stringify({p_invitation_id:invitationId})}));
  if(typeof data!=="string")throw new Error("L’acceptation de l’invitation n’a pas été confirmée.");
  return data;
}

export async function declineAtelierInvitation(session:YereSession,invitationId:string):Promise<void>{
  const data=await parse(await authenticatedFetch(session,"rest/v1/rpc/decline_atelier_invitation",{method:"POST",body:JSON.stringify({p_invitation_id:invitationId})}));
  if(data!==true)throw new Error("Le refus de l’invitation n’a pas été confirmé.");
}

export async function cancelAtelierInvitation(session:YereSession,invitationId:string):Promise<void>{
  const data=await parse(await authenticatedFetch(session,"rest/v1/rpc/cancel_atelier_invitation",{method:"POST",body:JSON.stringify({p_invitation_id:invitationId})}));
  if(data!==true)throw new Error("La révocation de l’invitation n’a pas été confirmée.");
}
