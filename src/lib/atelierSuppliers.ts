import type { StockItem } from "../domain";
import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch } from "./supabaseAuth";

export type AtelierSupplier = {
  id: string; name: string; contact: string; phone: string; city: string; category: string; note: string; active: boolean;
};
export type AtelierSupplierPurchase = {
  id: string; supplierId: string; reference: string; orderedAt: string;
  status: "À recevoir" | "Reçue" | "Annulée"; receivedAt?: string; cancelledAt?: string; cancelReason?: string; note?: string;
  lines: Array<{ stockItemId: string; quantity: number; unitCost: number }>;
  payments: Array<{ id: string; paidAt: string; amount: number; note?: string }>;
};
type SupplierRow = {id:string;nom:string;contact:string|null;telephone:string|null;ville:string|null;categorie:string|null;note:string|null;actif:boolean};
type PurchaseRow = {id:string;fournisseur_id:string;reference:string;date_commande:string;statut:string;date_reception:string|null;date_annulation:string|null;motif_annulation:string|null;note:string|null};
type LineRow = {id:string;achat_id:string;article_id:string;quantite:number;cout_unitaire_fcfa:number};
type PaymentRow = {id:string;achat_id:string;date_paiement:string;montant_fcfa:number;note:string|null};
async function json(response:Response):Promise<unknown>{const body=await response.json().catch(()=>({}));if(!response.ok){const e=body as Record<string,unknown>;throw new Error(String(e.message??e.details??e.hint??e.error??`Erreur serveur (${response.status})`));}return body;}
export async function listAtelierSuppliers(session:YereSession,atelierId:string):Promise<AtelierSupplier[]>{
 const r=await authenticatedFetch(session,`rest/v1/fournisseur?select=id,nom,contact,telephone,ville,categorie,note,actif&atelier_id=eq.${encodeURIComponent(atelierId)}&order=nom.asc`);
 const data=await json(r);if(!Array.isArray(data))throw new Error("Réponse fournisseurs invalide.");
 return (data as SupplierRow[]).map(x=>({id:x.id,name:x.nom,contact:x.contact??"",phone:x.telephone??"",city:x.ville??"",category:x.categorie??"",note:x.note??"",active:x.actif}));
}
export async function createAtelierSupplier(session:YereSession,atelierId:string,input:Omit<AtelierSupplier,"id"|"active">):Promise<AtelierSupplier>{
 const r=await authenticatedFetch(session,"rest/v1/fournisseur?select=id,nom,contact,telephone,ville,categorie,note,actif",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({atelier_id:atelierId,nom:input.name,contact:input.contact||null,telephone:input.phone||null,ville:input.city||null,categorie:input.category||null,note:input.note||null})});
 const data=await json(r);const x=Array.isArray(data)?data[0] as SupplierRow|undefined:undefined;if(!x)throw new Error("Le fournisseur n'a pas été confirmé par le serveur.");
 return {id:x.id,name:x.nom,contact:x.contact??"",phone:x.telephone??"",city:x.ville??"",category:x.categorie??"",note:x.note??"",active:x.actif};
}
export async function listAtelierSupplierPurchases(session:YereSession,atelierId:string):Promise<AtelierSupplierPurchase[]>{
 const f=encodeURIComponent(atelierId);
 const [a,b,c]=await Promise.all([
  authenticatedFetch(session,`rest/v1/achat_fournisseur?select=id,fournisseur_id,reference,date_commande,statut,date_reception,date_annulation,motif_annulation,note&atelier_id=eq.${f}&order=date_commande.desc`),
  authenticatedFetch(session,`rest/v1/ligne_achat_fournisseur?select=id,achat_id,article_id,quantite,cout_unitaire_fcfa&atelier_id=eq.${f}`),
  authenticatedFetch(session,`rest/v1/paiement_fournisseur?select=id,achat_id,date_paiement,montant_fcfa,note&atelier_id=eq.${f}&order=date_paiement.asc`)
 ]);
 const [aa,bb,cc]=await Promise.all([json(a),json(b),json(c)]);
 if(!Array.isArray(aa)||!Array.isArray(bb)||!Array.isArray(cc))throw new Error("Réponse achats fournisseurs invalide.");
 const lines=bb as LineRow[],payments=cc as PaymentRow[];
 return (aa as PurchaseRow[]).map(x=>({id:x.id,supplierId:x.fournisseur_id,reference:x.reference,orderedAt:x.date_commande,
  status:x.statut==="recue"?"Reçue":x.statut==="annulee"?"Annulée":"À recevoir",
  ...(x.date_reception?{receivedAt:x.date_reception}:{}),...(x.date_annulation?{cancelledAt:x.date_annulation}:{}),
  ...(x.motif_annulation?{cancelReason:x.motif_annulation}:{}),...(x.note?{note:x.note}:{}),
  lines:lines.filter(l=>l.achat_id===x.id).map(l=>({stockItemId:l.article_id,quantity:Number(l.quantite),unitCost:Number(l.cout_unitaire_fcfa)})),
  payments:payments.filter(p=>p.achat_id===x.id).map(p=>({id:p.id,paidAt:p.date_paiement,amount:Number(p.montant_fcfa),...(p.note?{note:p.note}:{})}))
 }));
}
export async function createAtelierSupplierPurchase(session:YereSession,atelierId:string,supplierId:string,input:{reference:string;orderedAt:string;note?:string;lines:Array<{stockItemId:string;quantity:number;unitCost:number}>}):Promise<string>{
 const r=await authenticatedFetch(session,"rest/v1/rpc/create_supplier_purchase",{method:"POST",body:JSON.stringify({p_atelier_id:atelierId,p_fournisseur_id:supplierId,p_reference:input.reference,p_date_commande:input.orderedAt,p_note:input.note??"",p_lignes:input.lines.map(l=>({article_id:l.stockItemId,quantite:l.quantity,cout_unitaire_fcfa:l.unitCost}))})});
 const data=await json(r);const row=Array.isArray(data)?data[0] as {achat_id?:string}|undefined:undefined;if(!row?.achat_id)throw new Error("L'achat n'a pas été confirmé par le serveur.");return row.achat_id;
}
export async function receiveAtelierSupplierPurchase(session:YereSession,atelierId:string,purchaseId:string,date:string):Promise<void>{
 await json(await authenticatedFetch(session,"rest/v1/rpc/receive_supplier_purchase",{method:"POST",body:JSON.stringify({p_atelier_id:atelierId,p_achat_id:purchaseId,p_date_reception:date})}));
}
export async function payAtelierSupplierPurchase(session:YereSession,atelierId:string,purchaseId:string,input:{amount:number;paidAt:string;note?:string}):Promise<void>{
 const key=`yere-supplier-payment-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
 await json(await authenticatedFetch(session,"rest/v1/paiement_fournisseur",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({atelier_id:atelierId,achat_id:purchaseId,date_paiement:input.paidAt,montant_fcfa:input.amount,note:input.note??null,cle_idempotence:key})}));
}
export async function cancelAtelierSupplierPurchase(session:YereSession,atelierId:string,purchaseId:string,date:string,reason:string):Promise<void>{
 await json(await authenticatedFetch(session,`rest/v1/achat_fournisseur?id=eq.${encodeURIComponent(purchaseId)}&atelier_id=eq.${encodeURIComponent(atelierId)}&statut=eq.a_recevoir`,{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({statut:"annulee",date_annulation:date,motif_annulation:reason})}));
}

export type AtelierSupplierProfile = {
 businessName:string; contactName:string; phone:string; city:string; category:string; shopName:string; description:string;
};
type SupplierProfileRow = {nom_entreprise:string;nom_contact:string;telephone:string;ville:string;categorie:string;nom_boutique:string;description:string};
export async function getAtelierSupplierProfile(session:YereSession,atelierId:string):Promise<AtelierSupplierProfile|null>{
 const r=await authenticatedFetch(session,`rest/v1/profil_fournisseur?select=nom_entreprise,nom_contact,telephone,ville,categorie,nom_boutique,description&atelier_id=eq.${encodeURIComponent(atelierId)}`);
 const data=await json(r);if(!Array.isArray(data))throw new Error("Réponse du profil fournisseur invalide.");
 const x=(data as SupplierProfileRow[])[0];return x?{businessName:x.nom_entreprise,contactName:x.nom_contact,phone:x.telephone,city:x.ville,category:x.categorie,shopName:x.nom_boutique,description:x.description}:null;
}
export async function saveAtelierSupplierProfile(session:YereSession,atelierId:string,profile:AtelierSupplierProfile):Promise<void>{
 await json(await authenticatedFetch(session,"rest/v1/profil_fournisseur?on_conflict=atelier_id",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({atelier_id:atelierId,nom_entreprise:profile.businessName,nom_contact:profile.contactName,telephone:profile.phone,ville:profile.city,categorie:profile.category,nom_boutique:profile.shopName,description:profile.description})}));
}
