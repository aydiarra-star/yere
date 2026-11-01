import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch } from "./supabaseAuth";

export type AtelierSubscription = {
  id: string;
  atelierId: string;
  monthlyPriceXof: number;
  currency: "XOF";
  status: "essai" | "actif" | "paiement_requis" | "en_retard" | "suspendu" | "resilie";
  trialStartsAt: string;
  trialEndsAt: string;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  nextDueAt: string | null;
  paymentProvider: string | null;
};
export type SubscriptionPayment = {
  id: string;
  amountXof: number;
  status: "en_attente" | "confirme" | "echec" | "rembourse" | "annule";
  method: "wave" | "orange_money" | "carte" | "autre" | null;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
};
type SubscriptionRow = {
  id:string; atelier_id:string; montant_mensuel_fcfa:number; devise:"XOF"; statut:AtelierSubscription["status"];
  debut_essai:string; fin_essai:string; periode_debut:string|null; periode_fin:string|null;
  prochaine_echeance:string|null; fournisseur_paiement:string|null;
};
type PaymentRow = {
  id:string; montant_fcfa:number; statut:SubscriptionPayment["status"]; moyen_paiement:SubscriptionPayment["method"];
  reference_fournisseur:string|null; paye_le:string|null; created_at:string;
};
async function readJson(response:Response):Promise<unknown>{
  const body=await response.json().catch(()=>({}));
  if(!response.ok){const e=body as Record<string,unknown>;throw new Error(String(e.message??e.details??e.hint??e.error??`Erreur abonnement (${response.status})`));}
  return body;
}
export async function getAtelierSubscription(session:YereSession,atelierId:string):Promise<AtelierSubscription|null>{
  const response=await authenticatedFetch(session,
    `rest/v1/abonnement_atelier?select=id,atelier_id,montant_mensuel_fcfa,devise,statut,debut_essai,fin_essai,periode_debut,periode_fin,prochaine_echeance,fournisseur_paiement&atelier_id=eq.${encodeURIComponent(atelierId)}&limit=1`);
  const data=await readJson(response);if(!Array.isArray(data))throw new Error("Données d'abonnement invalides.");
  const x=(data as SubscriptionRow[])[0];return x?{
    id:x.id,atelierId:x.atelier_id,monthlyPriceXof:Number(x.montant_mensuel_fcfa),currency:x.devise,status:x.statut,
    trialStartsAt:x.debut_essai,trialEndsAt:x.fin_essai,periodStartsAt:x.periode_debut,periodEndsAt:x.periode_fin,
    nextDueAt:x.prochaine_echeance,paymentProvider:x.fournisseur_paiement
  }:null;
}
export async function listAtelierSubscriptionPayments(session:YereSession,subscriptionId:string):Promise<SubscriptionPayment[]>{
  const response=await authenticatedFetch(session,
    `rest/v1/abonnement_paiement?select=id,montant_fcfa,statut,moyen_paiement,reference_fournisseur,paye_le,created_at&abonnement_id=eq.${encodeURIComponent(subscriptionId)}&order=created_at.desc`);
  const data=await readJson(response);if(!Array.isArray(data))throw new Error("Historique de paiement invalide.");
  return (data as PaymentRow[]).map(x=>({id:x.id,amountXof:Number(x.montant_fcfa),status:x.statut,method:x.moyen_paiement,
    providerReference:x.reference_fournisseur,paidAt:x.paye_le,createdAt:x.created_at}));
}
