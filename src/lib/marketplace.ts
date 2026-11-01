import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch } from "./supabaseAuth";

export type MarketplaceSeller = {
  id: string;
  userId: string;
  sellerType: "fournisseur" | "atelier";
  atelierId: string | null;
  businessName: string;
  contactName: string;
  phone: string;
  city: string;
  category: string;
  description: string;
  status: "actif" | "suspendu";
};

export type MarketplaceListing = {
  id: string;
  sellerId: string;
  title: string;
  category: string;
  description: string;
  priceXof: number;
  unit: "unite" | "metre" | "lot" | "rouleau" | "piece";
  city: string;
  photos: string[];
  saleMode: "contact_direct" | "commande_yere" | "les_deux";
  status: "brouillon" | "publiee" | "indisponible" | "archivee";
  stockAvailable: number | null;
  createdAt: string;
};

export type MarketplaceOrder = {
  id: string;
  reference: string;
  listingId: string;
  sellerId: string;
  buyerUserId: string;
  quantity: number;
  unitPriceXof: number;
  totalXof: number;
  buyerName: string;
  buyerPhone: string;
  deliveryCity: string;
  buyerNote: string;
  status: "recue" | "acceptee" | "preparee" | "expediee" | "livree" | "annulee";
  paymentStatus: "non_paye" | "a_payer" | "en_attente" | "paye" | "echec" | "rembourse";
  createdAt: string;
};

type SellerRow = {
  id: string; user_id: string; type_vendeur: MarketplaceSeller["sellerType"]; atelier_id: string | null;
  nom_entreprise: string; nom_contact: string; telephone: string; ville: string; categorie: string;
  description: string; statut: MarketplaceSeller["status"];
};
type ListingRow = {
  id: string; vendeur_id: string; titre: string; categorie: string; description: string; prix_fcfa: number;
  unite: MarketplaceListing["unit"]; ville: string; photos: string[]; mode_vente: MarketplaceListing["saleMode"];
  statut: MarketplaceListing["status"]; stock_disponible: number | null; created_at: string;
};
type OrderRow = {
  id: string; reference: string; annonce_id: string; vendeur_id: string; acheteur_user_id: string;
  quantite: number; prix_unitaire_fcfa: number; total_fcfa: number; nom_acheteur: string;
  telephone_acheteur: string; ville_livraison: string; note_acheteur: string; statut: MarketplaceOrder["status"];
  paiement_statut: MarketplaceOrder["paymentStatus"]; created_at: string;
};

async function readJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body as Record<string, unknown>;
    throw new Error(String(error.message ?? error.details ?? error.hint ?? error.error ?? `Erreur marketplace (${response.status})`));
  }
  return body;
}

function mapSeller(row: SellerRow): MarketplaceSeller {
  return { id: row.id, userId: row.user_id, sellerType: row.type_vendeur, atelierId: row.atelier_id,
    businessName: row.nom_entreprise, contactName: row.nom_contact, phone: row.telephone, city: row.ville,
    category: row.categorie, description: row.description, status: row.statut };
}
function mapListing(row: ListingRow): MarketplaceListing {
  return { id: row.id, sellerId: row.vendeur_id, title: row.titre, category: row.categorie,
    description: row.description, priceXof: Number(row.prix_fcfa), unit: row.unite, city: row.ville,
    photos: Array.isArray(row.photos) ? row.photos : [], saleMode: row.mode_vente, status: row.statut,
    stockAvailable: row.stock_disponible === null ? null : Number(row.stock_disponible), createdAt: row.created_at };
}
function mapOrder(row: OrderRow): MarketplaceOrder {
  return { id: row.id, reference: row.reference, listingId: row.annonce_id, sellerId: row.vendeur_id,
    buyerUserId: row.acheteur_user_id, quantity: Number(row.quantite), unitPriceXof: Number(row.prix_unitaire_fcfa),
    totalXof: Number(row.total_fcfa), buyerName: row.nom_acheteur, buyerPhone: row.telephone_acheteur,
    deliveryCity: row.ville_livraison, buyerNote: row.note_acheteur, status: row.statut,
    paymentStatus: row.paiement_statut, createdAt: row.created_at };
}

export async function getMyMarketplaceSeller(session: YereSession): Promise<MarketplaceSeller | null> {
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_vendeur?select=id,user_id,type_vendeur,atelier_id,nom_entreprise,nom_contact,telephone,ville,categorie,description,statut&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Profil vendeur invalide.");
  return data.length ? mapSeller(data[0] as SellerRow) : null;
}

export async function createMarketplaceSeller(session: YereSession, input: Omit<MarketplaceSeller, "id" | "userId" | "status">): Promise<MarketplaceSeller> {
  const response = await authenticatedFetch(session, "rest/v1/marketplace_vendeur?select=id,user_id,type_vendeur,atelier_id,nom_entreprise,nom_contact,telephone,ville,categorie,description,statut", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ user_id: session.user.id, type_vendeur: input.sellerType, atelier_id: input.atelierId,
      nom_entreprise: input.businessName.trim(), nom_contact: input.contactName.trim(), telephone: input.phone.trim(),
      ville: input.city.trim(), categorie: input.category.trim(), description: input.description.trim() })
  });
  const data = await readJson(response);
  if (!Array.isArray(data) || !data[0]) throw new Error("Le compte vendeur n'a pas été confirmé.");
  return mapSeller(data[0] as SellerRow);
}

export async function listMarketplaceListings(session: YereSession, includeOwnDrafts = false): Promise<MarketplaceListing[]> {
  const fields = "id,vendeur_id,titre,categorie,description,prix_fcfa,unite,ville,photos,mode_vente,statut,stock_disponible,created_at";
  const filter = includeOwnDrafts
    ? "or=(statut.eq.publiee,statut.eq.brouillon,statut.eq.indisponible,statut.eq.archivee)"
    : "statut=eq.publiee";
  const response = await authenticatedFetch(session, `rest/v1/marketplace_annonce?select=${fields}&${filter}&order=created_at.desc`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Catalogue marketplace invalide.");
  return (data as ListingRow[]).map(mapListing);
}

export async function saveMarketplaceListing(session: YereSession, input: {
  id?: string; sellerId: string; title: string; category: string; description: string; priceXof: number;
  unit: MarketplaceListing["unit"]; city: string; photos: string[]; saleMode: MarketplaceListing["saleMode"];
  status: MarketplaceListing["status"]; stockAvailable: number | null;
}): Promise<string> {
  const body = { vendeur_id: input.sellerId, titre: input.title.trim(), categorie: input.category.trim(),
    description: input.description.trim(), prix_fcfa: input.priceXof, unite: input.unit, ville: input.city.trim(),
    photos: input.photos.slice(0, 5), mode_vente: input.saleMode, statut: input.status,
    stock_disponible: input.stockAvailable };
  const url = input.id
    ? `rest/v1/marketplace_annonce?id=eq.${encodeURIComponent(input.id)}`
    : "rest/v1/marketplace_annonce";
  const response = await authenticatedFetch(session, url, {
    method: input.id ? "PATCH" : "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body)
  });
  const data = await readJson(response);
  if (!Array.isArray(data) || !data[0]?.id) throw new Error("L'annonce n'a pas été enregistrée.");
  return String(data[0].id);
}

export async function createMarketplaceOrder(session: YereSession, input: {
  listingId: string; quantity: number; buyerName: string; buyerPhone: string; deliveryCity?: string; buyerNote?: string;
}): Promise<string> {
  const data = await readJson(await authenticatedFetch(session, "rest/v1/rpc/creer_commande_marketplace", {
    method: "POST", body: JSON.stringify({ p_annonce_id: input.listingId, p_quantite: input.quantity,
      p_nom_acheteur: input.buyerName, p_telephone_acheteur: input.buyerPhone,
      p_ville_livraison: input.deliveryCity ?? "", p_note_acheteur: input.buyerNote ?? "" })
  }));
  if (typeof data !== "string") throw new Error("La commande marketplace n'a pas été confirmée.");
  return data;
}

export async function listMyMarketplaceOrders(session: YereSession): Promise<MarketplaceOrder[]> {
  const response = await authenticatedFetch(session,
    "rest/v1/marketplace_commande?select=id,reference,annonce_id,vendeur_id,acheteur_user_id,quantite,prix_unitaire_fcfa,total_fcfa,nom_acheteur,telephone_acheteur,ville_livraison,note_acheteur,statut,paiement_statut,created_at&order=created_at.desc");
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Historique des commandes marketplace invalide.");
  return (data as OrderRow[]).map(mapOrder);
}

export async function updateMarketplaceOrderStatus(session: YereSession, orderId: string, status: MarketplaceOrder["status"]): Promise<void> {
  const data = await readJson(await authenticatedFetch(session, "rest/v1/rpc/changer_statut_commande_marketplace", {
    method: "POST", body: JSON.stringify({ p_commande_id: orderId, p_statut: status })
  }));
  if (data !== true) throw new Error("Le changement de statut n'a pas été confirmé.");
}
