import type { YereSession } from "./supabaseAuth";
import { authenticatedFetch, publicFetch } from "./supabaseAuth";

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
  id: string; type_vendeur: MarketplaceSeller["sellerType"]; atelier_id: string | null;
  nom_entreprise: string; ville: string; categorie: string; description: string;
  statut: MarketplaceSeller["status"];
};
type SellerContactRow = { nom_contact: string; telephone: string };
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

function mapSeller(row: SellerRow, userId: string, contact: SellerContactRow): MarketplaceSeller {
  return { id: row.id, userId, sellerType: row.type_vendeur, atelierId: row.atelier_id,
    businessName: row.nom_entreprise, contactName: contact.nom_contact, phone: contact.telephone, city: row.ville,
    category: row.categorie, description: row.description, status: row.statut };
}

async function getOwnSellerContact(session: YereSession): Promise<SellerContactRow> {
  const response = await authenticatedFetch(session, "rest/v1/rpc/get_my_marketplace_seller_contact", {
    method: "POST", body: "{}"
  });
  const data = await readJson(response);
  if (!Array.isArray(data) || !data[0]
    || typeof data[0].nom_contact !== "string" || typeof data[0].telephone !== "string") {
    throw new Error("Les coordonnées privées du vendeur n'ont pas été confirmées.");
  }
  return data[0] as SellerContactRow;
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
  const fields = "id,type_vendeur,atelier_id,nom_entreprise,ville,categorie,description,statut";
  const response = await authenticatedFetch(session,
    `rest/v1/marketplace_vendeur?select=${fields}&id=not.is.null&limit=1`);
  const data = await readJson(response);
  if (!Array.isArray(data)) throw new Error("Profil vendeur invalide.");
  if (!data.length) return null;
  const contact = await getOwnSellerContact(session);
  return mapSeller(data[0] as SellerRow, session.user.id, contact);
}

export async function createMarketplaceSeller(session: YereSession, input: Omit<MarketplaceSeller, "id" | "userId" | "status">): Promise<MarketplaceSeller> {
  const response = await authenticatedFetch(session, "rest/v1/marketplace_vendeur", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: session.user.id, type_vendeur: input.sellerType, atelier_id: input.atelierId,
      nom_entreprise: input.businessName.trim(), nom_contact: input.contactName.trim(), telephone: input.phone.trim(),
      ville: input.city.trim(), categorie: input.category.trim(), description: input.description.trim() })
  });
  await readJson(response);
  const fields = "id,type_vendeur,atelier_id,nom_entreprise,ville,categorie,description,statut";
  const profileResponse = await authenticatedFetch(session,
    `rest/v1/marketplace_vendeur?select=${fields}&id=not.is.null&order=created_at.desc&limit=1`);
  const data = await readJson(profileResponse);
  if (!Array.isArray(data) || !data[0]) throw new Error("Le compte vendeur n'a pas été confirmé.");
  const contact = await getOwnSellerContact(session);
  return mapSeller(data[0] as SellerRow, session.user.id, contact);
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

async function createMarketplacePhotoSignedUrl(path: string): Promise<string | null> {
  try {
    const response = await publicFetch(
      `storage/v1/object/sign/${MARKETPLACE_PHOTO_BUCKET}/${storageObjectPath(path)}`,
      { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) }
    );
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


export type PublicMarketplaceListing = MarketplaceListing & { sellerName: string; sellerCity: string; photoUrls: string[] };

type PublicSellerRow = { id: string; nom_entreprise: string; ville: string; statut: "actif" | "suspendu" };

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
    `rest/v1/marketplace_vendeur?select=id,nom_entreprise,ville,statut&id=in.(${sellerFilter})&statut=eq.actif`
  );
  const sellersData = await readJson(sellersResponse);
  if (!Array.isArray(sellersData)) throw new Error("Informations publiques des vendeurs invalides.");
  const sellers = new Map((sellersData as PublicSellerRow[]).map((seller) => [seller.id, seller]));
  const publicListings = rows.flatMap((row) => {
    const seller = sellers.get(row.vendeur_id);
    if (!seller) return [];
    return [{ ...mapListing(row), sellerName: seller.nom_entreprise, sellerCity: seller.ville }];
  });
  return Promise.all(publicListings.map(async (listing) => ({
    ...listing,
    photoUrls: (await Promise.all(listing.photos.map(createMarketplacePhotoSignedUrl)))
      .filter((url): url is string => url !== null)
  })));
}
