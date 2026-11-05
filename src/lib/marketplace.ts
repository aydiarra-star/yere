import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch, publicFetch, projectUrl } from "./supabaseAuth";

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
  logoPath: string | null;
  logoUrl: string | null;
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
  id: string; type_vendeur: MarketplaceSeller["sellerType"]; atelier_id: string | null;
  nom_entreprise: string; nom_contact: string; telephone: string; ville: string;
  categorie: string; description: string; logo_path: string | null; statut: MarketplaceSeller["status"];
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

async function mapSeller(row: SellerRow, userId: string, session: YereSession): Promise<MarketplaceSeller> {
  return { id: row.id, userId, sellerType: row.type_vendeur, atelierId: row.atelier_id,
    businessName: row.nom_entreprise, contactName: row.nom_contact, phone: row.telephone, city: row.ville,
    category: row.categorie, description: row.description, logoPath: row.logo_path ?? null,
    logoUrl: row.logo_path ? await createMarketplacePhotoSignedUrl(row.logo_path, session) : null, status: row.statut };
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
  // This owner-scoped RPC returns no row for ordinary buyer accounts.
  const response = await authenticatedFetch(session, "rest/v1/rpc/get_my_marketplace_seller_profile", {
    method: "POST", body: "{}"
  });
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Profil vendeur invalide.");
  if (!data.length) return null;
  return await mapSeller(data[0] as SellerRow, session.user.id, session);
}

export async function createMarketplaceSeller(session: YereSession, input: { sellerType: MarketplaceSeller["sellerType"]; atelierId: string | null; businessName: string; contactName: string; phone: string; city: string; category: string; description: string }): Promise<MarketplaceSeller> {
  const response = await authenticatedFetch(session, "rest/v1/marketplace_vendeur", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: session.user.id, type_vendeur: input.sellerType, atelier_id: input.atelierId,
      nom_entreprise: input.businessName.trim(), nom_contact: input.contactName.trim(), telephone: input.phone.trim(),
      ville: input.city.trim(), categorie: input.category.trim(), description: input.description.trim() })
  });
  await readJson(response);
  const created = await getMyMarketplaceSeller(session);
  if (!created) throw new Error("Le compte vendeur n'a pas été confirmé.");
  return created;
}


export async function updateMarketplaceSeller(session: YereSession, sellerId: string, input: {
  businessName: string; contactName: string; phone: string; city: string; category: string; description: string; logoPath: string | null;
}): Promise<MarketplaceSeller> {
  const response = await authenticatedFetch(session, `rest/v1/marketplace_vendeur?id=eq.${encodeURIComponent(sellerId)}`, {
    method: "PATCH", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ nom_entreprise: input.businessName.trim(), nom_contact: input.contactName.trim(),
      telephone: input.phone.trim(), ville: input.city.trim(), categorie: input.category.trim(),
      description: input.description.trim(), logo_path: input.logoPath })
  });
  await readJson(response);
  const updated = await getMyMarketplaceSeller(session);
  if (!updated || updated.id !== sellerId) throw new Error("La mise à jour de la boutique n'a pas été confirmée.");
  return updated;
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

export async function listMyMarketplaceListings(
  session: YereSession,
  sellerId: string
): Promise<Array<MarketplaceListing & { photoUrls: string[] }>> {
  const fields = "id,vendeur_id,titre,categorie,description,prix_fcfa,unite,ville,photos,mode_vente,statut,stock_disponible,created_at";
  const statuses = "or=(statut.eq.publiee,statut.eq.brouillon,statut.eq.indisponible,statut.eq.archivee)";
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_annonce?select=${fields}&vendeur_id=eq.${encodeURIComponent(sellerId)}&${statuses}&order=created_at.desc`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Vos annonces n'ont pas pu être chargées.");
  return Promise.all((data as ListingRow[]).map(async (row) => ({
    ...mapListing(row),
    photoUrls: (await Promise.all((row.photos ?? []).map((path) => createMarketplacePhotoSignedUrl(path, session))))
      .filter((url): url is string => url !== null)
  })));
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
  const savedPhotos = data[0].photos;
  const expectedPhotos = body.photos;
  if (!Array.isArray(savedPhotos)
    || savedPhotos.length !== expectedPhotos.length
    || savedPhotos.some((path: unknown, index: number) => path !== expectedPhotos[index])) {
    throw new Error("L'annonce a été créée, mais ses photos n'ont pas été confirmées par le serveur. Réessayez avant de quitter cette page.");
  }
  return String(data[0].id);
}

export async function deleteMarketplaceListing(
  session: YereSession,
  listing: MarketplaceListing
): Promise<{ deleted: boolean; archived: boolean; photosCleaned: boolean }> {
  const url = `rest/v1/marketplace_annonce?id=eq.${encodeURIComponent(listing.id)}&vendeur_id=eq.${encodeURIComponent(listing.sellerId)}`;
  try {
    const data = await readJson(await authenticatedFetch(session, url, {
      method: "DELETE", headers: { Prefer: "return=representation" }
    }));
    if (!Array.isArray(data) || !data.some((row: { id?: string }) => row.id === listing.id)) {
      throw new Error("Annonce introuvable ou vous n'avez pas l'autorisation de la supprimer.");
    }
    let photosCleaned = true;
    try { await deleteMarketplacePhotos(session, listing.photos); } catch { photosCleaned = false; }
    return { deleted: true, archived: false, photosCleaned };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (!/23503|foreign key|référence|referenced/i.test(message)) throw cause;
    // Orders and conversations keep permanent references to their listing. Preserve that history by archiving it.
    await saveMarketplaceListing(session, {
      id: listing.id, sellerId: listing.sellerId, title: listing.title, category: listing.category,
      description: listing.description, priceXof: listing.priceXof, unit: listing.unit, city: listing.city,
      photos: listing.photos, saleMode: listing.saleMode, status: "archivee", stockAvailable: listing.stockAvailable
    });
    return { deleted: false, archived: true, photosCleaned: true };
  }
}

const MARKETPLACE_PHOTO_BUCKET = "yere-market-photos";
const MAX_MARKETPLACE_PHOTOS = 5;
const MAX_MARKETPLACE_PHOTO_BYTES = 5 * 1024 * 1024;
const MARKETPLACE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function storageObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/** Uploads seller-owned images to the private bucket. Partial uploads are rolled back. */
export async function uploadMarketplacePhotos(
  session: YereSession,
  sellerId: string,
  files: File[]
): Promise<string[]> {
  if (files.length > MAX_MARKETPLACE_PHOTOS) throw new Error("Vous pouvez ajouter cinq photos maximum.");
  const uploaded: string[] = [];
  try {
    for (const file of files) {
      if (!MARKETPLACE_PHOTO_TYPES.has(file.type)) throw new Error("Format refusé : utilisez JPG, PNG ou WebP.");
      if (file.size <= 0 || file.size > MAX_MARKETPLACE_PHOTO_BYTES) throw new Error("Chaque photo doit peser cinq mégaoctets maximum.");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${session.user.id}/${sellerId}/${crypto.randomUUID()}.${extension}`;
      const response = await authenticatedFetch(session,
        `storage/v1/object/${MARKETPLACE_PHOTO_BUCKET}/${storageObjectPath(path)}`,
        { method: "POST", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file });
      await readJson(response);
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) {
      try { await deleteMarketplacePhotos(session, uploaded); } catch { /* preserve the original upload error */ }
    }
    throw error;
  }
}

export async function deleteMarketplacePhotos(session: YereSession, paths: string[]): Promise<void> {
  if (!paths.length) return;
  await readJson(await authenticatedFetch(session, `storage/v1/object/${MARKETPLACE_PHOTO_BUCKET}`, {
    method: "DELETE", body: JSON.stringify({ prefixes: paths })
  }));
}

async function createMarketplacePhotoSignedUrl(path: string, session?: YereSession): Promise<string | null> {
  try {
    const signPath = `storage/v1/object/sign/${MARKETPLACE_PHOTO_BUCKET}/${storageObjectPath(path)}`;
    const request = { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) };
    // A seller's own private logo is readable only with their authenticated session.
    // Public catalogue photos continue to use the anonymous, published-listing policy.
    const response = session
      ? await authenticatedFetch(session, signPath, request)
      : await publicFetch(signPath, request);
    const data = await readJson(response) as { signedURL?: unknown };
    if (typeof data.signedURL !== "string" || !projectUrl) return null;
    const signedPath = data.signedURL;
    if (signedPath.startsWith("https://") || signedPath.startsWith("http://")) return signedPath;
    const normalized = signedPath.startsWith("/") ? signedPath : `/${signedPath}`;
    return normalized.startsWith("/storage/v1/")
      ? `${projectUrl.endsWith("/") ? projectUrl.slice(0, -1) : projectUrl}${normalized}`
      : `${projectUrl.endsWith("/") ? projectUrl.slice(0, -1) : projectUrl}/storage/v1${normalized}`;
  } catch {
    return null;
  }
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


export type MarketplaceConversation = {
  id: string;
  listingId: string;
  sellerId: string;
  buyerUserId: string;
  listingTitle: string;
  sellerName: string;
  updatedAt: string;
};

export type MarketplaceMessage = {
  id: string;
  conversationId: string;
  senderUserId: string;
  content: string;
  createdAt: string;
};

type ConversationRow = {
  id: string; annonce_id: string; vendeur_id: string; acheteur_user_id: string;
  titre_annonce: string; nom_vendeur: string; updated_at: string;
};
type MessageRow = {
  id: string; conversation_id: string; expediteur_user_id: string; contenu: string; created_at: string;
};

export async function listMyMarketplaceConversations(session: YereSession): Promise<MarketplaceConversation[]> {
  const response = await authenticatedFetch(session,
    "rest/v1/marketplace_conversation?select=id,annonce_id,vendeur_id,acheteur_user_id,titre_annonce,nom_vendeur,updated_at&order=updated_at.desc");
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Liste des conversations invalide.");
  return (data as ConversationRow[]).map((row) => ({
    id: row.id, listingId: row.annonce_id, sellerId: row.vendeur_id,
    buyerUserId: row.acheteur_user_id, listingTitle: row.titre_annonce,
    sellerName: row.nom_vendeur, updatedAt: row.updated_at
  }));
}

export async function listMarketplaceMessages(session: YereSession, conversationId: string): Promise<MarketplaceMessage[]> {
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_message?select=id,conversation_id,expediteur_user_id,contenu,created_at&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Historique des messages invalide.");
  return (data as MessageRow[]).map((row) => ({
    id: row.id, conversationId: row.conversation_id, senderUserId: row.expediteur_user_id,
    content: row.contenu, createdAt: row.created_at
  }));
}

export async function openMarketplaceConversation(
  session: YereSession,
  listingId: string,
  initialMessage: string
): Promise<string> {
  const data = await readJson(await authenticatedFetch(session, "rest/v1/rpc/ouvrir_conversation_marketplace", {
    method: "POST", body: JSON.stringify({ p_annonce_id: listingId, p_message_initial: initialMessage.trim() })
  }));
  if (typeof data !== "string") throw new Error("La conversation n'a pas été ouverte.");
  return data;
}

export async function sendMarketplaceMessage(
  session: YereSession,
  conversationId: string,
  content: string
): Promise<void> {
  const data = await readJson(await authenticatedFetch(session, "rest/v1/rpc/envoyer_message_marketplace", {
    method: "POST", body: JSON.stringify({ p_conversation_id: conversationId, p_contenu: content.trim() })
  }));
  if (data !== true) throw new Error("Le message n'a pas été envoyé.");
}

export type PublicMarketplaceListing = MarketplaceListing & { sellerName: string; sellerCity: string; sellerType: MarketplaceSeller["sellerType"]; photoUrls: string[] };
export type MarketplaceSellerKindFilter = "tous" | MarketplaceSeller["sellerType"];

export function matchesMarketplaceSellerKind(sellerType: MarketplaceSeller["sellerType"], filter: MarketplaceSellerKindFilter): boolean {
  return filter === "tous" || sellerType === filter;
}

type PublicSellerRow = { id: string; nom_entreprise: string; ville: string; statut: "actif" | "suspendu"; type_vendeur: MarketplaceSeller["sellerType"] };

/** Public catalogue: only published listings and non-sensitive seller fields are requested. */
export async function listPublicMarketplaceListings(): Promise<PublicMarketplaceListing[]> {
  const fields = "id,vendeur_id,titre,categorie,description,prix_fcfa,unite,ville,photos,mode_vente,statut,stock_disponible,created_at";
  const response = await publicFetch(`rest/v1/marketplace_annonce?select=${fields}&statut=eq.publiee&order=created_at.desc`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Catalogue public marketplace invalide.");
  const rows = data as ListingRow[];
  if (!rows.length) return [];
  const sellerIds = [...new Set(rows.map((row) => row.vendeur_id))];
  const sellerFilter = sellerIds.map((id) => encodeURIComponent(id)).join(",");
  const sellersResponse = await publicFetch(
    `rest/v1/marketplace_vendeur?select=id,nom_entreprise,ville,statut,type_vendeur&id=in.(${sellerFilter})&statut=eq.actif`
  );
  const sellersData = await readJson(sellersResponse);
  if (!Array.isArray(sellersData)) throw new Error("Informations publiques des vendeurs invalides.");
  const sellers = new Map((sellersData as PublicSellerRow[]).map((seller) => [seller.id, seller]));
  const publicListings = rows.flatMap((row) => {
    const seller = sellers.get(row.vendeur_id);
    if (!seller) return [];
    return [{ ...mapListing(row), sellerName: seller.nom_entreprise, sellerCity: seller.ville, sellerType: seller.type_vendeur }];
  });
  return Promise.all(publicListings.map(async (listing) => ({
    ...listing,
    photoUrls: (await Promise.all(listing.photos.map((path) => createMarketplacePhotoSignedUrl(path))))
      .filter((url): url is string => url !== null)
  })));
}


export type MarketplaceReview = {
  id: string;
  orderId?: string;
  sellerId: string;
  rating: number;
  criteria: Record<string, number>;
  comment: string;
  sellerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

type MarketplaceReviewRow = {
  id: string; commande_id?: string; vendeur_id: string; note: number; criteres: Record<string, number>;
  commentaire: string; reponse_vendeur: string | null; repondu_at: string | null; created_at: string;
};

function mapMarketplaceReview(row: MarketplaceReviewRow): MarketplaceReview {
  return { id: row.id, orderId: row.commande_id, sellerId: row.vendeur_id, rating: Number(row.note),
    criteria: row.criteres ?? {}, comment: row.commentaire ?? "", sellerReply: row.reponse_vendeur ?? null,
    repliedAt: row.repondu_at ?? null, createdAt: row.created_at };
}

export async function listMarketplaceSellerReviews(sellerId: string): Promise<MarketplaceReview[]> {
  const response = await publicFetch(
    `rest/v1/marketplace_avis?select=id,vendeur_id,note,criteres,commentaire,reponse_vendeur,repondu_at,created_at&vendeur_id=eq.${encodeURIComponent(sellerId)}&statut=eq.publiee&order=created_at.desc&limit=50`
  );
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Les avis de ce vendeur n'ont pas pu être chargés.");
  return (data as MarketplaceReviewRow[]).map(mapMarketplaceReview);
}

export async function getMarketplaceReviewForOrder(session: YereSession, orderId: string): Promise<MarketplaceReview | null> {
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_avis?select=id,commande_id,vendeur_id,note,criteres,commentaire,reponse_vendeur,repondu_at,created_at&commande_id=eq.${encodeURIComponent(orderId)}&limit=1`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Impossible de vérifier l'avis de cette commande.");
  return data.length ? mapMarketplaceReview(data[0] as MarketplaceReviewRow) : null;
}

export async function getMarketplaceSellerType(session: YereSession, sellerId: string): Promise<MarketplaceSeller["sellerType"]> {
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_vendeur?select=type_vendeur&id=eq.${encodeURIComponent(sellerId)}&limit=1`);
  const data = await readJson(response);
  if (!Array.isArray(data) || !data[0]?.type_vendeur) throw new Error("Le profil du vendeur n'a pas été retrouvé.");
  return data[0].type_vendeur as MarketplaceSeller["sellerType"];
}

export async function createMarketplaceReview(session: YereSession, input: {
  orderId: string; sellerId: string; rating: number; criteria: Record<string, number>; comment: string;
}): Promise<void> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) throw new Error("Choisissez une note entre 1 et 5 étoiles.");
  if (input.comment.trim().length > 1200) throw new Error("Votre commentaire est trop long.");
  for (const [label, value] of Object.entries(input.criteria)) {
    if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error(`Note invalide pour : ${label}.`);
  }
  const data = await readJson(await authenticatedFetch(session, "rest/v1/marketplace_avis?select=id", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ commande_id: input.orderId, vendeur_id: input.sellerId, note: input.rating,
      criteres: input.criteria, commentaire: input.comment.trim() })
  }));
  if (!Array.isArray(data) || !data[0]?.id) throw new Error("Votre avis n'a pas été confirmé par le serveur.");
}

export async function replyToMarketplaceReview(session: YereSession, reviewId: string, reply: string): Promise<void> {
  const text = reply.trim();
  if (!text || text.length > 1200) throw new Error("La réponse doit contenir entre 1 et 1 200 caractères.");
  const data = await readJson(await authenticatedFetch(session,
    `rest/v1/marketplace_avis?id=eq.${encodeURIComponent(reviewId)}&select=id,reponse_vendeur,repondu_at`,
    { method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ reponse_vendeur: text, repondu_at: new Date().toISOString() }) }));
  if (!Array.isArray(data) || !data[0]?.id) throw new Error("La réponse du vendeur n'a pas été enregistrée.");
}

export async function reportMarketplaceReview(session: YereSession, reviewId: string, reason: "faux_avis" | "insulte" | "conflit_interet" | "autre" = "autre"): Promise<void> {
  await readJson(await authenticatedFetch(session, "rest/v1/marketplace_avis_signalement", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ avis_id: reviewId, motif: reason })
  }));
}

export function summarizeMarketplaceReviews(reviews: Array<Pick<MarketplaceReview, "rating">>): { count: number; average: number } {
  if (!reviews.length) return { count: 0, average: 0 };
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return { count: reviews.length, average: Math.round((total / reviews.length) * 10) / 10 };
}
