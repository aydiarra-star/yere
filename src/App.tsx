import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import HomeDashboard from "./HomeDashboard";
import { addOrderPayment, areClientOrderRelationsValid, areStockRelationsValid, balanceDue, createOrderMeasurementSnapshot, filterOrdersByDelivery, formatXof, getClientReminderSuggestions, isClientListValid, isExpenseListValid, isMeasurementValid, isOrderInputValid, isOrderListValid, isStockItemListValid, isStockMovementListValid, matchesClient, orderStatuses, retouchStages, saveMeasurementVersion, totalPaid, type Client, type Expense, type Measurement, type Order, type OrderDeliveryFilter, type OrderStatus, type RetouchStage, type StockItem, type StockMovement } from "./domain";
import { emptyAtelier, isAtelierProfileValid, normalizeAtelierProfile, workModes, type AtelierProfile, type WorkMode } from "./atelierProfile";
import { normalizeBackupOnboardingState, normalizeBackupMarketplaceListings } from "./localBackup";
import { isMarketplaceListingListValid, type MarketplaceListing } from "./marketplace";
import { usePersistentState } from "./usePersistentState";
import { createAtelierClient, createAtelierOrder, createAtelierExpense, createAtelierStockArticle, createAtelierStockMovement, listAtelierClients, listAtelierOrders, listAtelierExpenses, listAtelierStock, saveAtelierMeasurement, saveAtelierOrderStatus, saveAtelierPayment, voidAtelierExpense } from "./lib/atelierData";
import { readSession } from "./lib/supabaseAuth";
import { cancelAtelierInvitation, createAtelierInvitation, deactivateAtelierMember, listAtelierInvitations, listAtelierMembers, updateAtelierMemberRole, type AtelierInvitation, type AtelierMember } from "./lib/atelierTeam";
import { cancelAtelierSupplierPurchase, createAtelierSupplier, createAtelierSupplierPurchase, getAtelierSupplierProfile, listAtelierSupplierPurchases, listAtelierSuppliers, payAtelierSupplierPurchase, receiveAtelierSupplierPurchase, saveAtelierSupplierProfile, type AtelierSupplier } from "./lib/atelierSuppliers";
import { addSupplierPurchasePayment, cancelSupplierPurchase, isSupplierPurchaseListValid, supplierPurchaseBalance, supplierPurchasePaidTotal, supplierPurchaseLineTotal, supplierPurchaseTotal, supplierPurchasesPaidTotal, type SupplierPurchase, type SupplierPurchaseLine } from "./supplierPurchases";

const emptyMeasurement: Measurement = { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", arm: "", neck: "", thigh: "", legLength: "", garmentType: "Tenue complète", note: "" };

const measurementFieldsByGarment: Record<string, Array<[string, keyof Measurement]>> = {
  "Tenue complète": [["Tour de poitrine", "bust"], ["Tour de taille", "waist"], ["Tour de hanches", "hips"], ["Épaules", "shoulder"], ["Longueur de manche", "sleeve"], ["Longueur du vêtement", "length"], ["Tour de bras (biceps)", "arm"], ["Tour de cou", "neck"], ["Tour de cuisse", "thigh"], ["Longueur de jambe / pantalon", "legLength"]],
  "Boubou / robe": [["Tour de poitrine", "bust"], ["Tour de taille", "waist"], ["Tour de hanches", "hips"], ["Épaules", "shoulder"], ["Longueur de manche", "sleeve"], ["Longueur du vêtement", "length"], ["Tour de bras (biceps)", "arm"], ["Tour de cou", "neck"]],
  "Pantalon": [["Tour de taille", "waist"], ["Tour de hanches", "hips"], ["Tour de cuisse", "thigh"], ["Longueur de jambe / pantalon", "legLength"], ["Longueur du vêtement", "length"]],
  "Chemise": [["Tour de poitrine", "bust"], ["Tour de taille", "waist"], ["Épaules", "shoulder"], ["Longueur de manche", "sleeve"], ["Tour de cou", "neck"], ["Longueur du vêtement", "length"]],
  "Veste / costume": [["Tour de poitrine", "bust"], ["Tour de taille", "waist"], ["Tour de hanches", "hips"], ["Épaules", "shoulder"], ["Longueur de manche", "sleeve"], ["Longueur du vêtement", "length"], ["Tour de bras (biceps)", "arm"], ["Tour de cou", "neck"], ["Tour de cuisse", "thigh"], ["Longueur de jambe / pantalon", "legLength"]],
  "Autre": [["Tour de poitrine", "bust"], ["Tour de taille", "waist"], ["Tour de hanches", "hips"], ["Épaules", "shoulder"], ["Longueur de manche", "sleeve"], ["Longueur du vêtement", "length"], ["Tour de bras (biceps)", "arm"], ["Tour de cou", "neck"], ["Tour de cuisse", "thigh"], ["Longueur de jambe / pantalon", "legLength"]]
};

type View = "overview" | "clients" | "orders" | "cash" | "stock" | "account" | "marketplace" | "reminders" | "suppliers";
type SupplierProfile = { businessName: string; contactName: string; phone: string; city: string; category: string; shopName: string; description: string };
const emptyListing: Omit<MarketplaceListing, "id"> = { sellerType: "tailor", title: "", category: "Vêtements prêts à vendre", price: "", description: "", sellerName: "", city: "", imageUrl: "", imageUrls: [] };
const emptySupplier: SupplierProfile = { businessName: "", contactName: "", phone: "", city: "", category: "", shopName: "", description: "" };

function isSupplierProfileValid(value: unknown): value is SupplierProfile {
  return typeof value === "object" && value !== null
    && ["businessName", "contactName", "phone", "city", "category", "shopName", "description"]
      .every((key) => key in value && typeof (value as Record<string, unknown>)[key] === "string");
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanValue(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNullableTimestamp(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function App() {
  const [clients, setClients] = usePersistentState<Client[]>("yere-demo-clients-v1", [], isClientListValid, "atelier");
  const [orders, setOrders] = usePersistentState<Order[]>("yere-demo-orders-v1", [], isOrderListValid, "atelier");
  const [expenses, setExpenses] = usePersistentState<Expense[]>("yere-demo-expenses-v1", [], isExpenseListValid, "atelier");
  const [stockItems, setStockItems] = usePersistentState<StockItem[]>("yere-demo-stock-items-v1", [], isStockItemListValid, "atelier");
  const [stockMovements, setStockMovements] = usePersistentState<StockMovement[]>("yere-demo-stock-movements-v1", [], isStockMovementListValid, "atelier");
  const [atelier, setAtelier] = usePersistentState<AtelierProfile>("yere-demo-atelier-v1", emptyAtelier, isAtelierProfileValid, "atelier");
  const [supplier, setSupplier] = usePersistentState<SupplierProfile>("yere-supplier-profile-v1", emptySupplier, isSupplierProfileValid, "atelier");
  const [marketplaceListings, setMarketplaceListings] = usePersistentState<MarketplaceListing[]>("yere-marketplace-listings-v1", [], isMarketplaceListingListValid, "atelier");
  const [listingDraft, setListingDraft] = useState<Omit<MarketplaceListing, "id">>({ ...emptyListing });
  const [listingFormOpen, setListingFormOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = usePersistentState<boolean>("yere-demo-onboarding-complete-v1", false, isBooleanValue);
  const [onboardingStartedAt, setOnboardingStartedAt] = usePersistentState<number | null>("yere-demo-onboarding-started-at-v1", null, isNullableTimestamp);
  const [view, setView] = useState<View>("overview");
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<OrderDeliveryFilter>("all");
  const [newOrderClientId, setNewOrderClientId] = useState("");
  const [newOrderGarment, setNewOrderGarment] = useState("");
  const [newOrderKind, setNewOrderKind] = useState<"confection" | "retouche">("confection");
  const [newOrderDueDate, setNewOrderDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [newOrderPrice, setNewOrderPrice] = useState("");
  const [newOrderDeposit, setNewOrderDeposit] = useState("0");
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentHistoryOrderId, setPaymentHistoryOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Fournitures");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseToVoidId, setExpenseToVoidId] = useState<string | null>(null);
  const [expenseVoidReason, setExpenseVoidReason] = useState("");
  const [stockFormOpen, setStockFormOpen] = useState(false);
  const [stockName, setStockName] = useState("");
  const [stockUnit, setStockUnit] = useState("mètre");
  const [stockInitialQuantity, setStockInitialQuantity] = useState("0");
  const [stockMinimumQuantity, setStockMinimumQuantity] = useState("0");
  const [stockMovementItemId, setStockMovementItemId] = useState<string | null>(null);
  const [stockMovementType, setStockMovementType] = useState<"Entrée" | "Sortie">("Entrée");
  const [stockMovementQuantity, setStockMovementQuantity] = useState("");
  const [stockMovementNote, setStockMovementNote] = useState("");
  const [supplierPurchases, setSupplierPurchases] = usePersistentState<SupplierPurchase[]>("yere-demo-supplier-purchases-v1", [], isSupplierPurchaseListValid, "atelier");
  const [supplierDirectory, setSupplierDirectory] = useState<AtelierSupplier[]>([]);
  const [teamMembers, setTeamMembers] = useState<AtelierMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<AtelierInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"gestionnaire" | "employe">("employe");
  const [teamBusy, setTeamBusy] = useState(false);
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [purchaseSupplierName, setPurchaseSupplierName] = useState("");
  const [purchaseStockItemId, setPurchaseStockItemId] = useState("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [purchaseUnitCost, setPurchaseUnitCost] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");
  const [purchaseDraftLines, setPurchaseDraftLines] = useState<SupplierPurchaseLine[]>([]);
  const [purchaseToCancelId, setPurchaseToCancelId] = useState<string | null>(null);
  const [purchaseCancelReason, setPurchaseCancelReason] = useState("");
  const [supplierPaymentPurchaseId, setSupplierPaymentPurchaseId] = useState<string | null>(null);
  const [supplierPaymentAmount, setSupplierPaymentAmount] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [draftMeasurement, setDraftMeasurement] = useState<Measurement>({ ...emptyMeasurement });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (onboardingStartedAt === null) setOnboardingStartedAt(Date.now());
  }, [onboardingStartedAt, setOnboardingStartedAt]);

  useEffect(() => {
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) return;
    let active = true;
    void (async () => {
      try {
        // Load membership first: financial requests must never start before the role is known.
        const [serverMembers, serverInvitations] = await Promise.all([
          listAtelierMembers(session, atelierId), listAtelierInvitations(session, atelierId)
        ]);
        if (!active) return;
        const currentMember = serverMembers.find((member) => member.userId === session.user.id && member.active);
        const ownerAccess = currentMember?.role === "proprietaire";
        const [serverClients, serverOrders, serverStock, serverSuppliers, serverSupplierProfile,
          serverExpenses, serverPurchases] = await Promise.all([
          listAtelierClients(session, atelierId),
          listAtelierOrders(session, atelierId, ownerAccess),
          listAtelierStock(session, atelierId),
          listAtelierSuppliers(session, atelierId),
          getAtelierSupplierProfile(session, atelierId),
          ownerAccess ? listAtelierExpenses(session, atelierId) : Promise.resolve([]),
          ownerAccess ? listAtelierSupplierPurchases(session, atelierId) : Promise.resolve([])
        ]);
        if (!active) return;
        setClients(serverClients);
        setOrders(ownerAccess ? (current) => [...serverOrders, ...current.filter((order) => !order.serverId)] : serverOrders);
        setExpenses(ownerAccess ? (current) => [
          ...serverExpenses,
          ...current.filter((expense) => expense.id.startsWith("EXP-") && !serverExpenses.some((item) => item.id === expense.id))
        ] : []);
        setStockItems((current) => [
          ...serverStock.items,
          ...current.filter((item) => item.id.startsWith("STK-") && !serverStock.items.some((serverItem) => serverItem.id === item.id))
        ]);
        setStockMovements((current) => [
          ...serverStock.movements,
          ...current.filter((movement) => movement.id.startsWith("MOV-") && !serverStock.movements.some((serverMovement) => serverMovement.id === movement.id))
        ]);
        setSupplierDirectory(serverSuppliers);
        setTeamMembers(serverMembers);
        setTeamInvitations(serverInvitations);
        if (serverSupplierProfile) setSupplier(serverSupplierProfile);
        const supplierName = new Map(serverSuppliers.map((item) => [item.id, item.name]));
        const mappedPurchases: SupplierPurchase[] = serverPurchases.map((purchase) => ({
          id: purchase.id,
          supplierName: supplierName.get(purchase.supplierId) ?? "Fournisseur",
          orderedAt: purchase.orderedAt,
          lines: purchase.lines,
          status: purchase.status,
          ...(purchase.receivedAt ? { receivedAt: purchase.receivedAt } : {}),
          ...(purchase.cancelledAt ? { cancelledAt: purchase.cancelledAt } : {}),
          ...(purchase.cancelReason ? { cancelReason: purchase.cancelReason } : {}),
          ...(purchase.note ? { note: purchase.note } : {}),
          payments: purchase.payments
        }));
        setSupplierPurchases(ownerAccess ? (current) => [
          ...mappedPurchases,
          ...current.filter((purchase) => purchase.id.startsWith("ACH-") && !mappedPurchases.some((serverPurchase) => serverPurchase.id === purchase.id))
        ] : []);
      } catch (cause) {
        if (active) setNotice(cause instanceof Error
          ? `Impossible de synchroniser les données de l'atelier : ${cause.message}`
          : "Impossible de synchroniser les données de l'atelier avec le serveur.");
      }
    })();
    return () => { active = false; };
  }, [setClients, setOrders, setSupplierPurchases]);

  const visibleClients = useMemo(() => clients.filter((client) => matchesClient(client, query)), [clients, query]);
  const currentUserId = readSession()?.user.id;
  const canManageTeam = teamMembers.some((member) => member.userId === currentUserId && member.active && (member.role === "proprietaire" || member.role === "gestionnaire"));
  const isAtelierOwner = teamMembers.some((member) => member.userId === currentUserId && member.active && member.role === "proprietaire");
  const outstanding = isAtelierOwner ? orders.reduce((sum, order) => sum + balanceDue(order), 0) : 0;
  const outstandingOrderCount = isAtelierOwner ? orders.filter((order) => balanceDue(order) > 0).length : 0;
  const totalExpenses = isAtelierOwner ? expenses.reduce((sum, expense) => sum + (expense.voidedAt ? 0 : expense.amount), 0) : 0;
  const totalSupplierPayments = isAtelierOwner ? supplierPurchasesPaidTotal(supplierPurchases) : 0;
  const totalCashOutflows = totalExpenses + totalSupplierPayments;
  const totalCollected = isAtelierOwner ? orders.reduce((sum, order) => sum + totalPaid(order), 0) : 0;
  const selected = clients.find((client) => client.id === selectedClient);
  const reminderSuggestions = useMemo(
    () => getClientReminderSuggestions(clients, orders, new Date().toISOString().slice(0, 10)),
    [clients, orders]
  );

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const filteredOrders = useMemo(() => filterOrdersByDelivery(orders, todayKey, orderDeliveryFilter), [orders, todayKey, orderDeliveryFilter]);
  const atelierDisplayName = atelier.name.trim();
  const hasProfileDetails = [atelierDisplayName, atelier.phone, atelier.city, supplier.businessName, supplier.contactName,
    supplier.phone, supplier.city, supplier.category, supplier.shopName, supplier.description].some((value) => value.trim() !== "");
  const isExample = !onboardingComplete && !hasProfileDetails && clients.length === 0 && orders.length === 0
    && expenses.length === 0 && stockItems.length === 0 && stockMovements.length === 0
    && supplierPurchases.length === 0 && marketplaceListings.length === 0;

  useEffect(() => {
    if (!isAtelierOwner && view === "cash") setView("overview");
  }, [isAtelierOwner, view]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const sheet = document.querySelector<HTMLElement>(".more-sheet");
    document.body.classList.add("yere-dialog-open");
    sheet?.querySelector<HTMLButtonElement>(".more-heading button")?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMoreOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sheet) return;
      const controls = Array.from(sheet.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("yere-dialog-open");
      previousFocus?.focus({ preventScroll: true });
    };
  }, [mobileMoreOpen]);

  useEffect(() => {
    const client = clients.find((item) => item.id === selectedClient);
    setDraftMeasurement(client ? { ...client.measurement } : { ...emptyMeasurement });
  }, [selectedClient, clients]);

  async function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = clientName.trim();
    if (!name) return;
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) {
      setNotice("Votre session ou votre atelier n'est plus disponible. Reconnectez-vous.");
      return;
    }
    let client: Client;
    try {
      client = await createAtelierClient(session, atelierId, { name, phone: clientPhone.trim() });
    } catch (cause) {
      setNotice(cause instanceof Error ? `Client non enregistré : ${cause.message}` : "Impossible d'enregistrer ce client sur le serveur.");
      return;
    }
    setClients((current) => [client, ...current]);
    setNewOrderClientId(client.id);
    setClientName("");
    setClientPhone("");
    setShowForm(false);
    setView("clients");
    setSelectedClient(client.id);
    const firstClientMessage = clients.length === 0 && onboardingStartedAt !== null
      ? (Date.now() - onboardingStartedAt <= 180000
          ? " Première fiche créée en moins de 3 minutes : parcours de démarrage réussi."
          : " Le premier client a été créé après 3 minutes : le parcours pourra être simplifié.")
      : "";
    setNotice(`Fiche de ${name} enregistrée dans votre atelier YÉRÉ.${firstClientMessage}`);
  }

  async function addOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(newOrderPrice);
    const deposit = Number(newOrderDeposit);
    if (!isOrderInputValid({ clientId: newOrderClientId, garment: newOrderGarment, dueDate: newOrderDueDate, price, deposit }, clients.map((client) => client.id))) {
      setNotice("Vérifiez le client, le vêtement, la date de livraison, le prix et l'acompte. Les montants doivent être des nombres entiers positifs, et l'acompte ne peut pas dépasser le prix.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) {
      setNotice("Votre session ou votre atelier n'est plus disponible. Reconnectez-vous.");
      return;
    }
    if (deposit > 0 && !canManageTeam) {
      setNotice("Un employé peut créer une commande sans acompte. Le versement initial doit être enregistré par le propriétaire ou le gestionnaire.");
      return;
    }
    const orderedAt = new Date().toISOString().slice(0, 10);
    const orderClient = clients.find((client) => client.id === newOrderClientId);
    if (!orderClient) {
      setNotice("Ce client n’est plus disponible. Sélectionnez à nouveau un client.");
      return;
    }
    const measurementSnapshot = createOrderMeasurementSnapshot(orderClient.measurement, orderedAt);
    if (!measurementSnapshot) {
      setNotice("Les mensurations du client sont invalides. Vérifiez-les avant de créer la commande.");
      return;
    }
    const reference = `YR-${Date.now()}`;
    try {
      const order = await createAtelierOrder(session, atelierId, {
        reference, clientId: newOrderClientId, garment: newOrderGarment.trim(),
        kind: newOrderKind, ...(newOrderKind === "retouche" ? { retouchStage: "À examiner" as RetouchStage } : {}),
        ...measurementSnapshot, dueDate: newOrderDueDate, orderedAt, price, deposit, status: "À préparer"
      });
      setOrders((current) => [order, ...current]);
      setNewOrderGarment("");
      setNewOrderKind("confection");
      setNewOrderPrice("");
      setNewOrderDeposit("0");
      setShowOrderForm(false);
      setNotice(`Commande ${order.id} enregistrée dans votre atelier YÉRÉ, avec ${deposit > 0 ? "l'acompte initial" : "un solde intégral à régler"} synchronisé sur le serveur.`);
    } catch (cause) {
      setNotice(cause instanceof Error
        ? `Commande non enregistrée : ${cause.message}`
        : "Impossible d'enregistrer la commande sur le serveur.");
    }
  }

  async function compressMarketplacePhoto(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 900;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Préparation de la photo impossible.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.68);
  }

  async function addMarketplacePhotos(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith("image/"));
    input.value = "";
    if (files.length === 0) return;
    const existing = listingDraft.imageUrls ?? [];
    const available = Math.max(0, 4 - existing.length);
    if (available === 0) {
      setNotice("Quatre photos maximum par annonce. Retirez une photo avant d’en ajouter une autre.");
      return;
    }
    try {
      const prepared = await Promise.all(files.slice(0, available).map(compressMarketplacePhoto));
      setListingDraft((current) => ({ ...current, imageUrls: [...(current.imageUrls ?? []), ...prepared] }));
      setNotice(files.length > available ? "Quatre photos maximum : seules les premières photos sélectionnées ont été ajoutées." : "Photos ajoutées à la fiche. Enregistrez l’annonce pour les conserver.");
    } catch {
      setNotice("Une photo n’a pas pu être préparée. Essayez une image JPG, PNG ou WebP.");
    }
  }

  function editMarketplaceListing(listing: MarketplaceListing) {
    setEditingListingId(listing.id);
    setListingDraft({
      sellerType: listing.sellerType,
      sellerActivity: listing.sellerActivity,
      title: listing.title,
      category: listing.category,
      price: listing.price,
      description: listing.description,
      sellerName: listing.sellerName,
      city: listing.city,
      imageUrl: listing.imageUrl,
      imageUrls: listing.imageUrls ?? []
    });
    setListingFormOpen(true);
    setNotice("");
  }

  function saveMarketplaceListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!listingDraft.title.trim()) { setNotice("Ajoutez le nom du produit ou de la création avant l’enregistrement."); return; }
    if (!listingDraft.price.trim()) { setNotice("Ajoutez le prix affiché avant l’enregistrement."); return; }
    if (!listingDraft.sellerName.trim()) { setNotice("Indiquez votre nom professionnel ou celui de la boutique."); return; }
    const listing: MarketplaceListing = {
      ...listingDraft,
      sellerActivity: listingDraft.sellerType === "tailor" ? (listingDraft.sellerActivity ?? atelier.activity ?? "tailleur") : undefined,
      id: editingListingId ?? `listing-${Date.now()}`,
      title: listingDraft.title.trim(),
      sellerName: listingDraft.sellerName.trim(),
      description: listingDraft.description.trim(),
      city: listingDraft.city.trim(),
      price: listingDraft.price.trim(),
      imageUrl: listingDraft.imageUrl.trim(),
      imageUrls: (listingDraft.imageUrls ?? []).slice(0, 4)
    };
    setMarketplaceListings((current) => editingListingId
      ? current.map((item) => item.id === editingListingId ? listing : item)
      : [listing, ...current]);
    setListingFormOpen(false);
    setEditingListingId(null);
    setListingDraft({ ...emptyListing, imageUrls: [] });
    setNotice(editingListingId
      ? "Annonce modifiée et enregistrée dans ce navigateur. Elle n’est pas encore publiée publiquement sur Internet."
      : "Annonce enregistrée dans ce navigateur. Elle n’est pas encore publiée publiquement sur Internet.");
  }

  function exportLocalBackup() {
    const backup = {
      format: "yere-local-backup",
      schemaVersion: 5,
      exportedAt: new Date().toISOString(),
      data: { clients, orders, expenses, stockItems, stockMovements, supplierPurchases, marketplaceListings, atelier, supplier, onboardingComplete, onboardingStartedAt }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yere-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Export préparé. Le fichier contient des données clients, mensurations, commandes et annonces de vitrine : conservez-le dans un endroit sûr.");
  }

  function importLocalBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void file.text().then((raw) => {
      const parsed: unknown = JSON.parse(raw);
      if (!isObjectRecord(parsed) || parsed.format !== "yere-local-backup" || ![1, 2, 3, 4, 5].includes(parsed.schemaVersion as number) || !isObjectRecord(parsed.data)) {
        throw new Error("Format de sauvegarde YÉRÉ non reconnu.");
      }
      const data = parsed.data;
      const onboardingState = normalizeBackupOnboardingState(parsed.schemaVersion as number, data);
      const marketplaceListingsForRestore = normalizeBackupMarketplaceListings(parsed.schemaVersion as number, data);
      if (!isClientListValid(data.clients)
        || !isOrderListValid(data.orders)
        || !areClientOrderRelationsValid(data.clients, data.orders)
        || ([2, 3, 4, 5].includes(parsed.schemaVersion as number) && !isExpenseListValid(data.expenses))
        || (([3, 4, 5].includes(parsed.schemaVersion as number)) && (!isStockItemListValid(data.stockItems)
          || !isStockMovementListValid(data.stockMovements)
          || !areStockRelationsValid(data.stockItems, data.stockMovements)))
        || ([4, 5].includes(parsed.schemaVersion as number) && !isSupplierPurchaseListValid(data.supplierPurchases))
        || (parsed.schemaVersion === 5 && !isMarketplaceListingListValid(marketplaceListingsForRestore))
        || !isAtelierProfileValid(data.atelier)
        || (data.supplier !== undefined && !isSupplierProfileValid(data.supplier))
        || !isBooleanValue(onboardingState.onboardingComplete)
        || !isNullableTimestamp(onboardingState.onboardingStartedAt)) {
        throw new Error("La sauvegarde est incomplète ou contient des données invalides. Aucune donnée n'a été modifiée.");
      }
      setClients(data.clients);
      setOrders(data.orders);
      setExpenses(isExpenseListValid(data.expenses) ? data.expenses : []);
      setStockItems(isStockItemListValid(data.stockItems) ? data.stockItems : []);
      setStockMovements(isStockMovementListValid(data.stockMovements) ? data.stockMovements : []);
      setSupplierPurchases(isSupplierPurchaseListValid(data.supplierPurchases) ? data.supplierPurchases : []);
      setMarketplaceListings(isMarketplaceListingListValid(marketplaceListingsForRestore) ? marketplaceListingsForRestore : []);
      setAtelier(data.atelier);
      setSupplier(data.supplier !== undefined && isSupplierProfileValid(data.supplier) ? data.supplier : emptySupplier);
      setOnboardingComplete(onboardingState.onboardingComplete);
      setOnboardingStartedAt(onboardingState.onboardingStartedAt);
      setSelectedClient(null);
      setShowForm(false);
      setShowOrderForm(false);
      setView("overview");
      setNotice("Sauvegarde restaurée dans ce navigateur. Vérifiez les clients, les mensurations et les commandes. Cette restauration ne crée pas de copie serveur.");
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Fichier impossible à lire.";
      setNotice(`Restauration refusée : ${message}`);
    });
  }

  async function voidExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expense = expenses.find((item) => item.id === expenseToVoidId);
    const reason = expenseVoidReason.trim();
    if (!expense || expense.voidedAt || !reason) {
      setNotice("Choisissez une dépense active et indiquez le motif de l’annulation.");
      return;
    }
    if (expense.id.startsWith("EXP-")) {
      setNotice("Cette dépense provient d'une ancienne sauvegarde locale et n'est pas encore importée dans la caisse serveur. Conservez-la sur cet appareil jusqu'à sa migration.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      const cancelled = await voidAtelierExpense(session, atelierId, expense, new Date().toISOString().slice(0, 10), reason);
      setExpenses((current) => current.map((item) => item.id === expense.id ? cancelled : item));
      setExpenseToVoidId(null);
      setExpenseVoidReason("");
      setNotice("Dépense annulée sur le serveur et conservée dans l’historique.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Annulation non enregistrée : ${cause.message}` : "Impossible d'annuler cette dépense sur le serveur.");
    }
  }

  async function addStockItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = stockName.trim();
    const initialQuantity = Number(stockInitialQuantity);
    const minimumQuantity = Number(stockMinimumQuantity);
    if (!name || !stockUnit.trim() || !Number.isFinite(initialQuantity) || initialQuantity < 0
      || !Number.isFinite(minimumQuantity) || minimumQuantity < 0) {
      setNotice("Vérifiez le nom, l’unité et les quantités du produit.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      const created = await createAtelierStockArticle(session, atelierId, {
        name, unit: stockUnit.trim(), minimumQuantity, initialQuantity,
        createdAt: new Date().toISOString().slice(0, 10)
      });
      setStockItems((current) => [...created.items, ...current.filter((item) => item.id.startsWith("STK-"))]);
      setStockMovements((current) => [...created.movements, ...current.filter((movement) => movement.id.startsWith("MOV-"))]);
      setStockName("");
      setStockInitialQuantity("0");
      setStockMinimumQuantity("0");
      setStockFormOpen(false);
      setNotice("Article et stock initial enregistrés dans l’inventaire de l’atelier.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Article non enregistré : ${cause.message}` : "Impossible d'enregistrer cet article sur le serveur.");
    }
  }

  async function saveStockMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quantity = Number(stockMovementQuantity);
    const movement: Omit<StockMovement, "id"> = {
      itemId: stockMovementItemId ?? "",
      type: stockMovementType,
      quantity,
      movedAt: new Date().toISOString().slice(0, 10),
      note: stockMovementNote.trim() || undefined
    };
    if (!Number.isFinite(quantity) || quantity <= 0 || !stockItems.some((item) => item.id === movement.itemId)) {
      setNotice("Mouvement refusé : vérifiez l’article et la quantité.");
      return;
    }
    if (movement.itemId.startsWith("STK-")) {
      setNotice("Cet article vient d'une ancienne sauvegarde locale et n'est pas encore importé dans l'inventaire serveur.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      await createAtelierStockMovement(session, atelierId, movement);
      const refreshed = await listAtelierStock(session, atelierId);
      setStockItems((current) => [...refreshed.items, ...current.filter((item) => item.id.startsWith("STK-"))]);
      setStockMovements((current) => [...refreshed.movements, ...current.filter((item) => item.id.startsWith("MOV-"))]);
      setStockMovementItemId(null);
      setStockMovementQuantity("");
      setStockMovementNote("");
      setNotice("Mouvement de stock enregistré et vérifié sur le serveur.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Mouvement refusé : ${cause.message}` : "Impossible d'enregistrer le mouvement de stock.");
    }
  }

  function addPurchaseLine() {
    const quantity = Number(purchaseQuantity);
    const unitCost = Number(purchaseUnitCost);
    if (!purchaseStockItemId || !purchaseQuantity.trim() || !purchaseUnitCost.trim()
      || !Number.isFinite(quantity) || quantity <= 0
      || !Number.isSafeInteger(unitCost) || unitCost < 0
      || !stockItems.some((item) => item.id === purchaseStockItemId)) {
      setNotice("Choisissez un article et vérifiez sa quantité et son coût unitaire.");
      return;
    }
    if (purchaseDraftLines.some((line) => line.stockItemId === purchaseStockItemId)) {
      setNotice("Cet article est déjà dans l’achat. Modifiez sa ligne plutôt que de le dupliquer.");
      return;
    }
    setPurchaseDraftLines((current) => [...current, { stockItemId: purchaseStockItemId, quantity, unitCost }]);
    setPurchaseStockItemId("");
    setPurchaseQuantity("");
    setPurchaseUnitCost("");
    setNotice("Article ajouté à l’achat. Vous pouvez ajouter d’autres articles avant d’enregistrer.");
  }

  async function revokeTeamInvitation(invitationId: string) {
    const session = readSession();
    if (!session) { setNotice("Reconnectez-vous pour gérer les invitations."); return; }
    setTeamBusy(true);
    try {
      await cancelAtelierInvitation(session, invitationId);
      setTeamInvitations((current) => current.map((item) => item.id === invitationId ? { ...item, cancelledAt: new Date().toISOString() } : item));
      setNotice("Invitation révoquée. Le destinataire ne peut plus la réclamer.");
    } catch (cause) {
      setNotice(cause instanceof Error ? "Révocation impossible : " + cause.message : "Impossible de révoquer l’invitation.");
    } finally { setTeamBusy(false); }
  }

  async function changeTeamMemberRole(member: AtelierMember) {
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!isAtelierOwner || !session || !atelierId || member.role === "proprietaire") {
      setNotice("Seul le propriétaire peut modifier le rôle d'un collaborateur.");
      return;
    }
    const nextRole = member.role === "gestionnaire" ? "employe" : "gestionnaire";
    setTeamBusy(true);
    try {
      await updateAtelierMemberRole(session, atelierId, member.userId, nextRole);
      setTeamMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, role: nextRole } : item));
      setNotice("Rôle du collaborateur mis à jour.");
    } catch (cause) {
      setNotice(cause instanceof Error ? "Modification refusée : " + cause.message : "Impossible de modifier ce rôle.");
    } finally { setTeamBusy(false); }
  }

  async function deactivateTeamMember(member: AtelierMember) {
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!isAtelierOwner || !session || !atelierId || member.role === "proprietaire") {
      setNotice("Seul le propriétaire peut retirer un collaborateur.");
      return;
    }
    if (!window.confirm("Désactiver ce membre ? Son accès à l'atelier sera retiré, mais son historique sera conservé.")) return;
    setTeamBusy(true);
    try {
      await deactivateAtelierMember(session, atelierId, member.userId);
      setTeamMembers((current) => current.map((item) => item.userId === member.userId ? { ...item, active: false } : item));
      setNotice("Accès du collaborateur désactivé. Son historique est conservé.");
    } catch (cause) {
      setNotice(cause instanceof Error ? "Désactivation refusée : " + cause.message : "Impossible de désactiver ce membre.");
    } finally { setTeamBusy(false); }
  }

  async function inviteTeamMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNotice("Saisissez une adresse e-mail valide pour le collaborateur.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    setTeamBusy(true);
    try {
      const invitation = await createAtelierInvitation(session, atelierId, email, inviteRole);
      setTeamInvitations((current) => [invitation, ...current.filter((item) => item.id !== invitation.id)]);
      setInviteEmail("");
      setNotice("Invitation enregistrée pour " + email + ". La personne doit se connecter à YÉRÉ avec cette adresse pour l’accepter. L’envoi automatique d’e-mail sera activé avec le service serveur.");
    } catch (cause) {
      setNotice(cause instanceof Error ? "Invitation non créée : " + cause.message : "Impossible de créer l’invitation.");
    } finally { setTeamBusy(false); }
  }

  async function saveSupplierProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profile = { ...supplier, businessName: supplier.businessName.trim() };
    if (!profile.businessName) { setNotice("Indiquez le nom de votre entreprise fournisseur."); return; }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      await saveAtelierSupplierProfile(session, atelierId, profile);
      setSupplier(profile);
      setNotice("Profil fournisseur enregistré dans la base sécurisée de votre atelier.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Profil non enregistré : ${cause.message}` : "Impossible d'enregistrer le profil fournisseur.");
    }
  }

  async function addSupplierPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supplierName = purchaseSupplierName.trim();
    if (!supplierName || purchaseDraftLines.length === 0) {
      setNotice("Indiquez le fournisseur et ajoutez au moins un article à l’achat.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      let supplierRecord = supplierDirectory.find((item) => item.name.trim().toLocaleLowerCase("fr-FR") === supplierName.toLocaleLowerCase("fr-FR"));
      if (!supplierRecord) {
        supplierRecord = await createAtelierSupplier(session, atelierId, {
          name: supplierName, contact: "", phone: "", city: "", category: "", note: ""
        });
        setSupplierDirectory((current) => [...current, supplierRecord!].sort((a, b) => a.name.localeCompare(b.name, "fr")));
      }
      const reference = "ACH-" + Date.now();
      await createAtelierSupplierPurchase(session, atelierId, supplierRecord.id, {
        reference, orderedAt: new Date().toISOString().slice(0, 10),
        note: purchaseNote.trim() || undefined, lines: purchaseDraftLines.map((line) => ({ ...line }))
      });
      const [serverPurchases, serverSuppliers] = await Promise.all([
        listAtelierSupplierPurchases(session, atelierId), listAtelierSuppliers(session, atelierId)
      ]);
      setSupplierDirectory(serverSuppliers);
      const names = new Map(serverSuppliers.map((item) => [item.id, item.name]));
      const mappedPurchases: SupplierPurchase[] = serverPurchases.map((purchase) => ({
        id: purchase.id, supplierName: names.get(purchase.supplierId) ?? supplierName,
        orderedAt: purchase.orderedAt, lines: purchase.lines, status: purchase.status,
        ...(purchase.receivedAt ? { receivedAt: purchase.receivedAt } : {}),
        ...(purchase.cancelledAt ? { cancelledAt: purchase.cancelledAt } : {}),
        ...(purchase.cancelReason ? { cancelReason: purchase.cancelReason } : {}),
        ...(purchase.note ? { note: purchase.note } : {}), payments: purchase.payments
      }));
      setSupplierPurchases([...mappedPurchases, ...supplierPurchases.filter((purchase) => purchase.id.startsWith("ACH-"))]);
      setPurchaseSupplierName("");
      setPurchaseStockItemId("");
      setPurchaseQuantity("");
      setPurchaseUnitCost("");
      setPurchaseNote("");
      setPurchaseDraftLines([]);
      setPurchaseFormOpen(false);
      setNotice("Achat fournisseur enregistré sur le serveur. Le stock changera uniquement à la réception.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Achat non enregistré : ${cause.message}` : "Impossible d'enregistrer l'achat fournisseur.");
    }
  }

  async function receivePurchase(purchaseId: string) {
    const purchase = supplierPurchases.find((item) => item.id === purchaseId);
    if (!purchase) return;
    if (purchase.id.startsWith("ACH-")) {
      setNotice("Cet achat provient de l’ancien stockage local. Il doit être importé avant toute réception serveur.");
      return;
    }
    if (purchase.status !== "À recevoir" || !purchase.lines.length
      || purchase.lines.some((line) => !stockItems.some((item) => item.id === line.stockItemId))) {
      setNotice("Réception refusée : vérifiez l’état de l’achat et les articles de stock associés.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      const receivedAt = new Date().toISOString().slice(0, 10);
      await receiveAtelierSupplierPurchase(session, atelierId, purchase.id, receivedAt);
      const [refreshed, serverPurchases] = await Promise.all([
        listAtelierStock(session, atelierId), listAtelierSupplierPurchases(session, atelierId)
      ]);
      setStockItems((current) => [...refreshed.items, ...current.filter((item) => item.id.startsWith("STK-"))]);
      setStockMovements((current) => [...refreshed.movements, ...current.filter((item) => item.id.startsWith("MOV-"))]);
      const names = new Map(supplierDirectory.map((item) => [item.id, item.name]));
      const mapped: SupplierPurchase[] = serverPurchases.map((item) => ({
        id: item.id, supplierName: names.get(item.supplierId) ?? purchase.supplierName,
        orderedAt: item.orderedAt, lines: item.lines, status: item.status,
        ...(item.receivedAt ? { receivedAt: item.receivedAt } : {}),
        ...(item.cancelledAt ? { cancelledAt: item.cancelledAt } : {}),
        ...(item.cancelReason ? { cancelReason: item.cancelReason } : {}),
        ...(item.note ? { note: item.note } : {}), payments: item.payments
      }));
      setSupplierPurchases((current) => [...mapped, ...current.filter((item) => item.id.startsWith("ACH-"))]);
      setNotice("Achat réceptionné : les mouvements et le changement d’état ont été validés ensemble sur le serveur.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Réception non enregistrée : ${cause.message}` : "Impossible de confirmer la réception sur le serveur.");
    }
  }

  async function recordSupplierPurchasePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const purchase = supplierPurchases.find((item) => item.id === supplierPaymentPurchaseId);
    const amount = Number(supplierPaymentAmount);
    if (!purchase || purchase.id.startsWith("ACH-") || !Number.isSafeInteger(amount) || amount <= 0) {
      setNotice("Ce règlement nécessite un achat serveur et un montant entier supérieur à zéro.");
      return;
    }
    const updated = addSupplierPurchasePayment(purchase, {
      id: "SUP-PAY-" + Date.now(), paidAt: new Date().toISOString().slice(0, 10),
      amount, note: "Règlement fournisseur enregistré manuellement"
    });
    if (!updated) {
      setNotice("Règlement refusé : vérifiez le solde restant. Un paiement ne peut pas dépasser le montant dû.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      await payAtelierSupplierPurchase(session, atelierId, purchase.id, {
        amount, paidAt: new Date().toISOString().slice(0, 10), note: "Règlement fournisseur enregistré manuellement"
      });
      const serverPurchases = await listAtelierSupplierPurchases(session, atelierId);
      const names = new Map(supplierDirectory.map((item) => [item.id, item.name]));
      const mapped: SupplierPurchase[] = serverPurchases.map((item) => ({
        id: item.id, supplierName: names.get(item.supplierId) ?? purchase.supplierName,
        orderedAt: item.orderedAt, lines: item.lines, status: item.status,
        ...(item.receivedAt ? { receivedAt: item.receivedAt } : {}),
        ...(item.cancelledAt ? { cancelledAt: item.cancelledAt } : {}),
        ...(item.cancelReason ? { cancelReason: item.cancelReason } : {}),
        ...(item.note ? { note: item.note } : {}), payments: item.payments
      }));
      setSupplierPurchases((current) => [...mapped, ...current.filter((item) => item.id.startsWith("ACH-"))]);
      setSupplierPaymentAmount("");
      setSupplierPaymentPurchaseId(null);
      setNotice("Règlement fournisseur de " + formatXof(amount) + " enregistré sur le serveur. La réception et le stock restent inchangés.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Règlement non enregistré : ${cause.message}` : "Impossible d'enregistrer le règlement fournisseur.");
    }
  }

  async function cancelPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const purchase = supplierPurchases.find((item) => item.id === purchaseToCancelId);
    const cancelled = purchase
      ? cancelSupplierPurchase(purchase, new Date().toISOString().slice(0, 10), purchaseCancelReason)
      : null;
    if (!purchase || purchase.id.startsWith("ACH-") || !cancelled) {
      setNotice("Annulation refusée : seul un achat serveur non réglé et en attente peut être annulé avec un motif obligatoire.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      await cancelAtelierSupplierPurchase(session, atelierId, purchase.id, cancelled.cancelledAt!, cancelled.cancelReason!);
      const serverPurchases = await listAtelierSupplierPurchases(session, atelierId);
      const names = new Map(supplierDirectory.map((item) => [item.id, item.name]));
      const mapped: SupplierPurchase[] = serverPurchases.map((item) => ({
        id: item.id, supplierName: names.get(item.supplierId) ?? purchase.supplierName,
        orderedAt: item.orderedAt, lines: item.lines, status: item.status,
        ...(item.receivedAt ? { receivedAt: item.receivedAt } : {}),
        ...(item.cancelledAt ? { cancelledAt: item.cancelledAt } : {}),
        ...(item.cancelReason ? { cancelReason: item.cancelReason } : {}),
        ...(item.note ? { note: item.note } : {}), payments: item.payments
      }));
      setSupplierPurchases((current) => [...mapped, ...current.filter((item) => item.id.startsWith("ACH-"))]);
      setPurchaseToCancelId(null);
      setPurchaseCancelReason("");
      setNotice("Achat annulé sur le serveur. Le motif reste conservé dans l’historique et le stock est inchangé.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Annulation non enregistrée : ${cause.message}` : "Impossible d'annuler l'achat fournisseur.");
    }
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const category = expenseCategory.trim();
    const description = expenseDescription.trim();
    const amount = Number(expenseAmount);
    if (!category || !description || !Number.isSafeInteger(amount) || amount <= 0) {
      setNotice("Vérifiez la catégorie, le motif et le montant de la dépense. Le montant doit être un entier supérieur à zéro.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) { setNotice("Session ou atelier introuvable. Reconnectez-vous."); return; }
    try {
      const expense = await createAtelierExpense(session, atelierId, {
        spentAt: new Date().toISOString().slice(0, 10), category, description, amount
      });
      setExpenses((current) => [expense, ...current]);
      setExpenseDescription("");
      setExpenseAmount("");
      setExpenseFormOpen(false);
      setNotice("Dépense de " + formatXof(amount) + " enregistrée dans la caisse de l’atelier.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Dépense non enregistrée : ${cause.message}` : "Impossible d'enregistrer la dépense sur le serveur.");
    }
  }

  async function recordOrderPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = orders.find((item) => item.id === paymentOrderId);
    const amount = Number(paymentAmount);
    if (!order || !Number.isSafeInteger(amount) || amount <= 0) {
      setNotice("Saisissez un montant entier supérieur à zéro.");
      return;
    }
    const updated = addOrderPayment(order, {
      id: "pending-" + Date.now(), amount,
      paidAt: new Date().toISOString().slice(0, 10),
      note: "Versement enregistré manuellement"
    });
    if (!updated) {
      setNotice("Paiement refusé : vérifiez le montant restant dû. Un paiement ne peut pas dépasser le solde.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) {
      setNotice("Votre session ou votre atelier n'est plus disponible. Reconnectez-vous.");
      return;
    }
    try {
      const savedPayment = await saveAtelierPayment(session, atelierId, order, {
        amount, paidAt: new Date().toISOString().slice(0, 10), note: "Versement enregistré manuellement"
      });
      const confirmed = addOrderPayment(order, savedPayment);
      if (!confirmed) throw new Error("Le versement serveur n'a pas pu être intégré à l'historique.");
      setOrders((current) => current.map((item) => item.id === order.id ? confirmed : item));
      setPaymentAmount("");
      setPaymentOrderId(null);
      setNotice("Versement de " + formatXof(amount) + " enregistré et confirmé sur le serveur YÉRÉ.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Versement non enregistré : ${cause.message}` : "Impossible d'enregistrer le versement sur le serveur.");
    }
  }

  async function updateStatus(orderId: string, status: OrderStatus) {
    const order = orders.find((item) => item.id === orderId);
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!order || !session || !atelierId) {
      setNotice("Commande ou session introuvable. Reconnectez-vous puis réessayez.");
      return;
    }
    try {
      await saveAtelierOrderStatus(session, atelierId, order, status);
      setOrders((current) => current.map((item) => item.id === orderId ? { ...item, status } : item));
      setNotice(`Statut de la commande ${orderId} synchronisé.`);
    } catch (cause) {
      setNotice(cause instanceof Error ? `Statut non modifié : ${cause.message}` : "Impossible de modifier le statut sur le serveur.");
    }
  }

  async function updateRetouchStage(orderId: string, retouchStage: RetouchStage) {
    const order = orders.find((item) => item.id === orderId && item.kind === "retouche");
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!order || !session || !atelierId) {
      setNotice("Commande de retouche ou session introuvable. Réessayez après reconnexion.");
      return;
    }
    try {
      await saveAtelierOrderStatus(session, atelierId, order, order.status, retouchStage);
      setOrders((current) => current.map((item) => item.id === orderId && item.kind === "retouche" ? { ...item, retouchStage } : item));
      setNotice("Étape de retouche synchronisée sur le serveur YÉRÉ.");
    } catch (cause) {
      setNotice(cause instanceof Error ? `Étape de retouche non modifiée : ${cause.message}` : "Impossible de synchroniser l'étape de retouche.");
    }
  }

  function updateMeasurement(field: keyof Measurement, value: string) {
    setDraftMeasurement((current) => ({ ...current, [field]: value }));
  }

  async function saveMeasurements(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!isMeasurementValid(draftMeasurement)) {
      setNotice("Chaque mensuration doit être un nombre positif ou nul.");
      return;
    }
    const session = readSession();
    const atelierId = window.sessionStorage.getItem("yere-active-atelier");
    if (!session || !atelierId) {
      setNotice("Votre session ou votre atelier n'est plus disponible. Reconnectez-vous.");
      return;
    }
    const measuredAt = new Date().toISOString().slice(0, 10);
    const versionId = `m-${Date.now()}`;
    try {
      await saveAtelierMeasurement(session, atelierId, selected.id, draftMeasurement, measuredAt);
    } catch (cause) {
      setNotice(cause instanceof Error ? `Mensurations non enregistrées : ${cause.message}` : "Impossible d'enregistrer les mensurations sur le serveur.");
      return;
    }
    setClients((current) => current.map((client) => client.id === selected.id
      ? saveMeasurementVersion(client, draftMeasurement, measuredAt, versionId)
      : client));
    setNewOrderClientId(selected.id);
    setShowOrderForm(true);
    setView("orders");
    setNotice(`Mensurations de ${selected.name} synchronisées sur YÉRÉ. Troisième étape : créez maintenant une commande.`);
  }

  const mobileNavItems: { id: View | "more"; label: string; icon: string }[] = [
    { id: "overview", label: "Accueil", icon: "thread-spool" },
    { id: "clients", label: "Clients", icon: "address-book" },
    { id: "orders", label: "Commandes", icon: "dress-form" },
    ...(isAtelierOwner ? [{ id: "cash" as const, label: "Caisse", icon: "cash-notes" }] : []),
    { id: "more", label: "Plus", icon: "tailor-scissors" }
  ];

  function openAccount() {
    setMobileMoreOpen(false);
    if (!onboardingComplete && !atelierDisplayName) setOnboardingOpen(true);
    else setView("account");
  }

  function createOrder() {
    setNewOrderClientId(selectedClient ?? clients[0]?.id ?? "");
    setShowOrderForm(true);
    setView("orders");
    setMobileMoreOpen(false);
  }

  if (onboardingOpen) {
    return <Onboarding
      atelier={atelier}
      onAtelierChange={setAtelier}
      onCancel={() => setOnboardingOpen(false)}
      onFinish={() => {
        setOnboardingComplete(true);
        setOnboardingOpen(false);
        setView("overview");
        setNotice("");
      }}
    />;
  }

  return (
    <div className="app-shell yere-app">
      <header className="app-header">
        <div className="app-header-inner">
          <a className="yere-wordmark" href="#accueil" onClick={(event) => { event.preventDefault(); setView("overview"); setMobileMoreOpen(false); }} aria-label="YÉRÉ Tailleur, retour à l’accueil">
            <span className="wordmark-star" aria-hidden="true">✳</span>
            <span className="wordmark-copy"><strong>YÉRÉ</strong><small>TAILLEUR</small></span>
          </a>
          <div className="header-workspace"><span>VOTRE ESPACE</span><b>Atelier de couture</b></div>
          <nav className="desktop-nav" aria-label="Navigation principale">
            {mobileNavItems.map((item) => <button key={item.id} type="button" className={(item.id === "more" ? (mobileMoreOpen || ["stock", "account", "reminders", "suppliers", "marketplace"].includes(view)) : view === item.id) ? "desktop-nav-item is-active" : "desktop-nav-item"} onClick={() => { if (item.id === "more") setMobileMoreOpen((open) => !open); else { setView(item.id); setMobileMoreOpen(false); } }} aria-current={item.id !== "more" && view === item.id ? "page" : undefined} aria-expanded={item.id === "more" ? mobileMoreOpen : undefined}>{item.label}</button>)}
          </nav>
          <button type="button" className="app-profile" onClick={openAccount} aria-label="Mon atelier : ouvrir le profil de l’atelier"><span><NavIcon name="user-filled" /></span><span className="profile-label">Mon atelier</span><span className="profile-chevron" aria-hidden="true">⌄</span></button>
        </div>
      </header>

      <main className="main-content">
        <div className="page-wrap">
          {view !== "overview" && <div className="welcome-row secondary-welcome">
            <div className="welcome-copy">
              <p className="secondary-eyebrow">VOTRE ESPACE ATELIER</p>
              <h1 className="page-banner-title">{view === "clients" ? "Vos clients & mensurations" : view === "orders" ? "Suivi des commandes" : view === "cash" ? "La caisse de votre atelier" : view === "stock" ? "Gestion du stock" : view === "account" ? (atelier.name || "Votre compte atelier") : view === "marketplace" ? "La marketplace YÉRÉ" : view === "suppliers" ? "Espace fournisseurs" : "Faites revenir vos clients."}</h1>
              <p className="page-subtitle">{view === "clients" ? "Retrouvez les fiches clients et leurs dernières mesures." : view === "orders" ? "Suivez chaque pièce, de la préparation à la livraison." : view === "cash" ? "Suivez les acomptes et les montants à récupérer." : view === "stock" ? "Gardez un œil sur les fournitures de l’atelier." : view === "account" ? "Votre profil d’atelier." : view === "marketplace" ? "Tailleurs et fournisseurs : présentez vos produits et vos créations dans la vitrine YÉRÉ." : view === "suppliers" ? "Gérez votre profil fournisseur et préparez votre boutique YÉRÉ." : "Des occasions concrètes de reprendre contact avec vos clients."}</p>
            </div>
            {(["clients", "suppliers", "marketplace"].includes(view) || (view === "orders" && isAtelierOwner)) && <button className="primary-button welcome-action" onClick={() => { if (view === "orders") createOrder(); else if (view === "suppliers") setView("marketplace"); else if (view === "marketplace") { setListingDraft({ ...emptyListing, sellerType: "tailor", sellerActivity: atelier.activity ?? "tailleur", category: "Vêtements prêts à vendre", sellerName: atelier.name, city: atelier.city }); setListingFormOpen(true); setNotice(""); } else { setShowForm(true); setView("clients"); } }}><span className="cta-scissors-icon" aria-hidden="true"><NavIcon name="tailor-scissors" /></span> {view === "orders" ? "Créer une commande" : view === "suppliers" ? "Créer ma boutique" : view === "marketplace" ? "Créer ma vitrine" : "Nouveau client"}</button>}
          </div>}
          {notice && view !== "overview" && <div className="notice" role="status"><span aria-hidden="true">ⓘ</span><p>{notice}</p><button aria-label="Fermer le message" onClick={() => setNotice("")}>×</button></div>}

          {view === "overview" && <HomeDashboard
            atelierName={atelierDisplayName || (isExample ? "Diarra Tailleur" : "")}
            isExample={isExample}
            today={today}
            deliveryCount={orders.filter((order) => order.dueDate === todayKey && order.status !== "Livré").length}
            outstandingOrderCount={outstandingOrderCount}
            outstanding={outstanding}
            showFinancials={isAtelierOwner}
            activeOrderCount={orders.filter((order) => order.status !== "Livré").length}
            inProductionOrder={orders.find((order) => order.status === "En confection")}
            onOpenDeliveries={() => { setOrderDeliveryFilter("all"); setView("orders"); }}
            onOpenPayments={() => { if (isAtelierOwner) setView("cash"); }}
            onOpenProduction={() => { setOrderDeliveryFilter("all"); setView("orders"); }}
            onCreateOrder={createOrder}
            onOpenMeasurements={() => { setQuery(""); setSelectedClient(null); setView("clients"); setMobileMoreOpen(false); }}
            onOpenTools={() => setMobileMoreOpen(true)}
            onConfigure={() => setOnboardingOpen(true)}
          />}

          {view === "clients" && <section className="content-card clients-card"><div className="section-heading"><div><h2>Répertoire clients</h2><p>{clients.length} fiche{clients.length > 1 ? "s" : ""} dans cet atelier</p></div><label className="search-box"><span>⌕</span><input autoFocus={view === "clients"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par nom ou téléphone" aria-label="Rechercher un client" /></label></div>
            {showForm && <form className="new-client-form" onSubmit={addClient}><div><h3>Créer une fiche client</h3><p>Les mensurations pourront être complétées ensuite. Prototype local : n’utilisez pas encore de données clients réelles.</p></div><label>Nom complet<input required autoFocus value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Ex. Mariama Diallo" /></label><label>Téléphone<input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+221 77 000 00 00" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button">Enregistrer le client</button></div></form>}
            <div className="client-list">{visibleClients.map((client, index) => <button key={client.id} className={selectedClient === client.id ? "client-row selected" : "client-row"} onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}><span className={`client-avatar avatar-${index % 4}`}>{client.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="client-main"><b>{client.name}</b><small>{client.phone || "Pas de téléphone renseigné"}</small></span><span className="client-measurements"><b>{[client.measurement.bust, client.measurement.waist, client.measurement.hips, client.measurement.shoulder, client.measurement.sleeve, client.measurement.length, client.measurement.arm, client.measurement.neck, client.measurement.thigh, client.measurement.legLength].filter(Boolean).length}/10</b><small>mesures saisies</small></span><span className="row-chevron">›</span></button>)}
              {visibleClients.length === 0 && <div className="empty-state"><span>⌕</span><b>Aucun client trouvé</b><p>Essayez un autre nom ou numéro.</p></div>}
            </div>
            {selected && <div className="measurement-panel"><div className="section-heading"><div><h2>Mensurations de {selected.name}</h2><p>Dernière fiche de mesures enregistrée</p></div></div><form className="measurement-form" onSubmit={saveMeasurements}><label className="measure-field"><span>Type de vêtement</span><select aria-label="Type de vêtement" value={draftMeasurement.garmentType ?? "Tenue complète"} onChange={(event) => updateMeasurement("garmentType", event.target.value)}><option>Tenue complète</option><option>Boubou / robe</option><option>Pantalon</option><option>Chemise</option><option>Veste / costume</option><option>Autre</option></select></label><div className="measurement-grid">{(measurementFieldsByGarment[draftMeasurement.garmentType ?? "Tenue complète"] ?? measurementFieldsByGarment["Tenue complète"]).map(([label, key]) => <label className="measure-field" key={key}><span>{label} (cm)</span><input type="number" min="0" step="any" inputMode="decimal" aria-label={label} value={(draftMeasurement[key] ?? "") as string} onChange={(event) => updateMeasurement(key, event.target.value)} placeholder="Saisir en cm" /></label>)}</div><label className="measure-notes-field">Notes pour la prochaine commande<textarea value={draftMeasurement.note} onChange={(event) => updateMeasurement("note", event.target.value)} placeholder="Décrire les préférences, la coupe ou le tissu" rows={2} /></label><div className="form-actions"><button type="submit" className="primary-button">Enregistrer les mensurations</button></div></form><section className="measurement-history" aria-label="Historique des mensurations"><h3>Historique des prises de mesures</h3>{(selected.measurementHistory ?? []).length === 0 ? <p className="history-empty">Aucune prise de mesures enregistrée. Complétez les champs puis enregistrez une première version.</p> : <ol>{[...(selected.measurementHistory ?? [])].reverse().map((version) => <li key={version.id}><b>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(version.measuredAt + "T12:00:00"))}</b><span>{[version.measurement.garmentType, version.measurement.bust && `Poitrine ${version.measurement.bust} cm`, version.measurement.waist && `Taille ${version.measurement.waist} cm`, version.measurement.hips && `Hanches ${version.measurement.hips} cm`, version.measurement.shoulder && `Épaules ${version.measurement.shoulder} cm`, version.measurement.sleeve && `Manche ${version.measurement.sleeve} cm`, version.measurement.length && `Longueur ${version.measurement.length} cm`, version.measurement.arm && `Bras ${version.measurement.arm} cm`, version.measurement.neck && `Cou ${version.measurement.neck} cm`, version.measurement.thigh && `Cuisse ${version.measurement.thigh} cm`, version.measurement.legLength && `Jambe ${version.measurement.legLength} cm`, version.measurement.note].filter(Boolean).join(" · ") || "Aucune mesure renseignée"}</span><button type="button" className="secondary-button" onClick={() => { setDraftMeasurement({ ...version.measurement }); setNotice("Anciennes mensurations reprises dans le formulaire. Vérifiez-les puis enregistrez pour créer une nouvelle version datée."); }}>Reprendre ces mesures</button></li>)}</ol>}</section><p className="privacy-note">Les fiches clients, les mensurations et leur historique sont synchronisés sur le serveur. Les anciennes données locales ne sont pas importées automatiquement.</p></div>}
          </section>}

          {view === "orders" && <section className="content-card"><div className="section-heading"><div><h2>Commandes de l’atelier</h2><p>Modifiez le statut pour suivre la production.</p></div>{isAtelierOwner ? <button className="primary-button" onClick={() => { setShowOrderForm((value) => !value); setNewOrderClientId(selectedClient ?? clients[0]?.id ?? ""); }}>＋ Nouvelle commande</button> : null}</div>
            {isAtelierOwner && showOrderForm && <form className="new-order-form" onSubmit={addOrder}>
              <h3>Créer une commande</h3>
              <label>Client<select required value={newOrderClientId} onChange={(event) => setNewOrderClientId(event.target.value)}><option value="">Choisir un client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
              <label>Type de travail<select value={newOrderKind} onChange={(event) => setNewOrderKind(event.target.value as "confection" | "retouche")}><option value="confection">Confection / création</option><option value="retouche">Retouche</option></select></label>
              <label>Vêtement / création<input required maxLength={120} value={newOrderGarment} onChange={(event) => setNewOrderGarment(event.target.value)} placeholder={newOrderKind === "retouche" ? "Ex. raccourcir un pantalon" : "Ex. Boubou brodé"} /></label>
              <label>Date de livraison<input required type="date" value={newOrderDueDate} onChange={(event) => setNewOrderDueDate(event.target.value)} /></label>
              <label>Prix convenu (FCFA)<input required type="number" min="1" step="1" value={newOrderPrice} onChange={(event) => setNewOrderPrice(event.target.value)} placeholder="25000" /></label>
              <label>Acompte reçu (FCFA)<input required type="number" min="0" step="1" value={newOrderDeposit} onChange={(event) => setNewOrderDeposit(event.target.value)} /></label>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowOrderForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={clients.length === 0}>Enregistrer la commande</button></div>
              {clients.length === 0 && <div className="order-needs-client"><p className="history-empty">Créez d’abord un client pour lui associer une commande.</p><button type="button" className="secondary-button" onClick={() => { setShowForm(true); setView("clients"); }}>Ajouter un client</button></div>}
            </form>}
            <div className="order-filter-row">
              <label>Afficher les commandes
                <select value={orderDeliveryFilter} onChange={(event) => setOrderDeliveryFilter(event.target.value as OrderDeliveryFilter)}>
                  <option value="all">Toutes les commandes</option>
                  <option value="overdue">En retard</option>
                  <option value="upcoming">À livrer sous 7 jours</option>
                </select>
              </label>
              <p aria-live="polite">{filteredOrders.length} commande{filteredOrders.length === 1 ? "" : "s"} affichée{filteredOrders.length === 1 ? "" : "s"}</p>
            </div>
            <OrderTable orders={filteredOrders} clients={clients} onStatusChange={updateStatus} onRetouchStageChange={updateRetouchStage} showFinancials={isAtelierOwner} /></section>}


          {view === "cash" && isAtelierOwner && <section className="cash-page">
            <div className="cash-summary-grid">
              <article className="content-card cash-summary"><span>Reste à encaisser</span><strong>{formatXof(outstanding)}</strong><small>Soldes des commandes non réglées</small></article>
              <article className="content-card cash-summary"><span>Total encaissé</span><strong>{formatXof(totalCollected)}</strong><small>Versements enregistrés dans ce prototype</small></article>
              <article className="content-card cash-summary"><span>Dépenses enregistrées</span><strong>{formatXof(totalExpenses)}</strong><small>Dépenses actives synchronisées sur le serveur, hors règlements fournisseurs suivis séparément</small></article>
              <article className="content-card cash-summary"><span>Règlements fournisseurs</span><strong>{formatXof(totalSupplierPayments)}</strong><small>Sorties enregistrées dans le module Achats fournisseurs</small></article>
              <article className="content-card cash-summary"><span>Encaissements − sorties suivies</span><strong>{formatXof(totalCollected - totalCashOutflows)}</strong><small>Indicateur de trésorerie simplifié, pas un solde comptable</small></article>
            </div>
            <section className="content-card"><div className="section-heading"><div><h2>Dépenses de l’atelier</h2><p>Notez les frais courants. Ne ressaisissez pas ici un achat déjà suivi dans Achats fournisseurs, pour éviter de compter deux fois la même sortie.</p></div><button type="button" className="primary-button" onClick={() => setExpenseFormOpen((open) => !open)}>{expenseFormOpen ? "Annuler" : "＋ Nouvelle dépense"}</button></div>
              {expenseFormOpen && <form className="new-order-form" onSubmit={addExpense}><label>Catégorie<select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>Fournitures</option><option>Tissus</option><option>Transport</option><option>Électricité / eau</option><option>Loyer</option><option>Main-d’œuvre</option><option>Entretien</option><option>Autre</option></select></label><label>Motif<input required maxLength={120} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="Ex. achat de fil et fermetures" /></label><label>Montant (FCFA)<input required type="number" min="1" step="1" inputMode="numeric" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="Ex. 7500" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setExpenseFormOpen(false)}>Annuler</button><button type="submit" className="primary-button">Enregistrer la dépense</button></div></form>}
              {expenses.length === 0 ? <div className="empty-state">Aucune dépense enregistrée. Les dépenses saisies apparaîtront ici.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Catégorie</th><th>Motif</th><th>Montant</th><th>État</th><th>Action</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id}><td>{expense.spentAt}</td><td>{expense.category}</td><td>{expense.description}{expense.voidReason && <small>Annulation : {expense.voidReason} · {expense.voidedAt}</small>}</td><td><b className={expense.voidedAt ? "paid" : ""}>{formatXof(expense.amount)}</b></td><td>{expense.voidedAt ? "Annulée" : "Active"}</td><td>{expense.voidedAt ? "—" : <button type="button" className="secondary-button" onClick={() => { setExpenseToVoidId(expense.id); setExpenseVoidReason(""); }}>Annuler</button>}</td></tr>)}</tbody></table></div>}{expenseToVoidId && expenses.some((expense) => expense.id === expenseToVoidId && !expense.voidedAt) && <form className="new-order-form" onSubmit={voidExpense}><h3>Annuler une dépense</h3><p>La dépense restera visible dans l’historique ; son montant sera exclu du total actif.</p><label>Motif obligatoire<input required maxLength={160} value={expenseVoidReason} onChange={(event) => setExpenseVoidReason(event.target.value)} placeholder="Ex. saisie en double" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setExpenseToVoidId(null); setExpenseVoidReason(""); }}>Retour</button><button type="submit" className="primary-button">Confirmer l’annulation</button></div></form>}
            </section>
            <section className="content-card"><div className="section-heading"><div><h2>Situation par commande</h2><p>Reste dû = prix convenu moins l’ensemble des versements enregistrés.</p></div></div>
              {orders.length === 0 ? <div className="empty-state">Aucune commande pour le moment. Créez une commande pour commencer à suivre les montants.</div> : <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Prix</th><th>Total encaissé</th><th>Reste</th><th>Action</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.garment}</b><small>{clients.find((client) => client.id === order.clientId)?.name || "Client inconnu"}</small></td><td>{formatXof(order.price)}</td><td>{formatXof(totalPaid(order))}</td><td><b>{formatXof(balanceDue(order))}</b></td><td><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setPaymentHistoryOrderId(order.id)}>Historique</button><button type="button" className="secondary-button" disabled={balanceDue(order) === 0} onClick={() => { setPaymentOrderId(order.id); setPaymentAmount(""); }}>Encaisser</button></div></td></tr>)}</tbody></table></div>}{paymentOrderId && orders.some((order) => order.id === paymentOrderId) && <form className="new-order-form" onSubmit={recordOrderPayment}><h3>Nouveau versement — {orders.find((order) => order.id === paymentOrderId)?.garment}</h3><p>Reste à payer : {formatXof(balanceDue(orders.find((order) => order.id === paymentOrderId)!))}</p><label>Montant reçu (FCFA)<input required type="number" min="1" step="1" inputMode="numeric" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Ex. 5000" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setPaymentOrderId(null); setPaymentAmount(""); }}>Annuler</button><button type="submit" className="primary-button">Confirmer le versement</button></div></form>}{paymentHistoryOrderId && orders.some((order) => order.id === paymentHistoryOrderId) && <section className="content-card"><div className="section-heading"><div><h2>Historique des versements</h2><p>{orders.find((order) => order.id === paymentHistoryOrderId)?.garment} · {clients.find((client) => client.id === orders.find((order) => order.id === paymentHistoryOrderId)?.clientId)?.name ?? "Client inconnu"}</p></div><button type="button" className="secondary-button" onClick={() => setPaymentHistoryOrderId(null)}>Fermer</button></div>{(orders.find((order) => order.id === paymentHistoryOrderId)?.payments ?? []).length === 0 ? <p className="empty-state">Aucun historique détaillé disponible pour cette ancienne commande. Son acompte historique reste pris en compte dans le solde et sera repris lors du prochain versement.</p> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Libellé</th><th>Montant</th></tr></thead><tbody>{(orders.find((order) => order.id === paymentHistoryOrderId)?.payments ?? []).map((payment) => <tr key={payment.id}><td>{payment.paidAt}</td><td>{payment.note || "Versement"}</td><td>{formatXof(payment.amount)}</td></tr>)}</tbody></table></div>}</section>}
            </section>
            <p className="privacy-note">Cette vue est un aperçu des montants des commandes. Le rapprochement de caisse, les écritures comptables et les rapports financiers restent à développer. Cette vue ne remplace pas une comptabilité officielle.</p>
          </section>}

          {view === "account" && <section className="content-card account-page">
            <div className="section-heading account-section-heading"><div><h2>Compte et profil de l’atelier</h2><p>Modifiez les informations de votre espace YÉRÉ.</p></div></div>
            <form className="account-form" onSubmit={(event) => { event.preventDefault(); setAtelier((current) => normalizeAtelierProfile(current)); setNotice("Profil d'atelier mis à jour localement. La synchronisation des champs de profil sera ajoutée dans un prochain chantier."); }}>
              <div className="profile-profession" aria-label="Métier YÉRÉ"><span>Métier</span><strong>Tailleur</strong><small>YÉRÉ est actuellement dédié aux tailleurs.</small></div>
              
              <label>Organisation du travail<select value={atelier.workMode ?? "independent"} onChange={(event) => setAtelier((current) => ({ ...current, workMode: event.target.value as WorkMode }))}>{workModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
              <label>Nom de l'atelier ou de l'activité<input required value={atelier.name} onChange={(event) => setAtelier((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Téléphone<input value={atelier.phone} onChange={(event) => setAtelier((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Ville<input value={atelier.city} onChange={(event) => setAtelier((current) => ({ ...current, city: event.target.value }))} /></label>
              <button type="submit" className="primary-button">Enregistrer le profil</button>
            </form>
            <section className="content-card team-panel" aria-labelledby="team-title">
              <div className="section-heading"><div><h3 id="team-title">Équipe et accès à l’atelier</h3><p>Les droits sont contrôlés sur le serveur et chaque membre reste limité à cet atelier.</p></div><span className="marketplace-listing-count">{teamMembers.filter((member) => member.active).length} membre(s)</span></div>
              <div className="table-wrap"><table><thead><tr><th>Identifiant du compte</th><th>Rôle</th><th>État</th><th>Depuis</th>{isAtelierOwner ? <th>Actions</th> : null}</tr></thead><tbody>{teamMembers.map((member) => <tr key={member.userId}><td><code>{member.userId.slice(0,8)}…{member.userId.slice(-4)}</code>{member.userId === currentUserId ? <small>Votre compte</small> : null}</td><td>{member.role === "proprietaire" ? "Propriétaire" : member.role === "gestionnaire" ? "Gestionnaire" : "Employé"}</td><td>{member.active ? "Actif" : "Désactivé"}</td><td>{new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(member.createdAt))}</td>{isAtelierOwner ? <td>{member.role !== "proprietaire" ? <div className="team-member-actions"><button type="button" className="text-button" disabled={teamBusy || !member.active} onClick={() => void changeTeamMemberRole(member)}>{member.role === "gestionnaire" ? "Rétablir employé" : "Nommer gestionnaire"}</button>{member.active ? <button type="button" className="text-button" disabled={teamBusy} onClick={() => void deactivateTeamMember(member)}>Désactiver</button> : <span className="privacy-note">Accès retiré</span>}</div> : <span className="privacy-note">Compte propriétaire protégé</span>}</td> : null}</tr>)}</tbody></table></div>
              {canManageTeam ? <>
                <form className="new-order-form team-invite-form" onSubmit={inviteTeamMember}>
                  <h4>Inviter un collaborateur</h4>
                  <label>Adresse e-mail<input type="email" required maxLength={254} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="collaborateur@exemple.com" /></label>
                  <label>Rôle<select value={isAtelierOwner ? inviteRole : "employe"} onChange={(event) => setInviteRole(event.target.value as "gestionnaire" | "employe")}><option value="employe">Employé — accès opérationnel</option>{isAtelierOwner ? <option value="gestionnaire">Gestionnaire — gestion de l’atelier</option> : null}</select></label>{!isAtelierOwner ? <p className="privacy-note">Seul le propriétaire peut nommer un gestionnaire. Votre invitation sera créée avec le rôle Employé.</p> : null}
                  <div className="form-actions"><button className="primary-button" type="submit" disabled={teamBusy}>{teamBusy ? "Création…" : "Créer l’invitation"}</button></div>
                </form>
                <div className="team-invitation-list"><h4>Invitations envoyées</h4>{teamInvitations.filter((item) => !item.acceptedAt && !item.cancelledAt && !item.declinedAt).length === 0 ? <p className="empty-state">Aucune invitation en attente.</p> : teamInvitations.filter((item) => !item.acceptedAt && !item.cancelledAt && !item.declinedAt).map((item) => <div className="team-invitation-row" key={item.id}><span><b>{item.email}</b><small>{item.role === "gestionnaire" ? "Gestionnaire" : "Employé"} · expire le {new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium"}).format(new Date(item.expiresAt))}</small></span><span className="team-invitation-status">{new Date(item.expiresAt).getTime() > Date.now() ? "En attente" : "Expirée"}<button type="button" className="text-button" disabled={teamBusy || new Date(item.expiresAt).getTime() <= Date.now()} onClick={() => void revokeTeamInvitation(item.id)}>Révoquer</button></span></div>)}</div>
              </> : <p className="privacy-note">Seuls le propriétaire et les gestionnaires peuvent créer des invitations. Vous pouvez consulter votre propre accès à l’atelier.</p>}
              <p className="privacy-note">L’invitation est enregistrée côté serveur et peut être acceptée uniquement par un compte dont l’adresse e-mail est confirmée et correspond à l’invitation. Aucun e-mail automatique n’est envoyé à ce stade.</p>
            </section>
            <section className="backup-panel" aria-labelledby="backup-title">
              <div><h3 id="backup-title">Sauvegarde locale</h3><p>Exportez vos fiches, mensurations, commandes, annonces de vitrine et profil. La restauration remplace les données actuellement enregistrées sur cet appareil.</p></div>
              <div className="backup-actions">
                <button type="button" className="primary-button" onClick={exportLocalBackup}>Exporter une sauvegarde (.json)</button>
                <label className="secondary-button backup-import-label" htmlFor="yere-backup-file">Restaurer une sauvegarde</label>
                <input id="yere-backup-file" className="backup-file-input" type="file" accept=".json,application/json" onChange={importLocalBackup} />
              </div>
              <p className="privacy-note">Attention : le fichier exporté contient des informations personnelles. Gardez-le hors d’accès public. Avant restauration, exportez les données actuelles si vous souhaitez les conserver.</p>
            </section>
            <div className="account-secondary"><div><b>Relances clients</b><p>Consultez les suggestions de relance manuelle, sans envoi automatique.</p></div><button className="secondary-button" onClick={() => setView("reminders")}>Ouvrir les relances →</button></div>
            <p className="privacy-note">Les comptes, les ateliers et les données métier principales sont synchronisés. Les champs de profil de cet écran restent enregistrés localement jusqu’au raccordement de leur formulaire à la base serveur.</p>
          </section>}
          {view === "stock" && <section className="stock-page">
            <div className="cash-summary-grid">
              <article className="content-card cash-summary"><span>Articles suivis</span><strong>{stockItems.length}</strong><small>Articles synchronisés sur le serveur</small></article>
              <article className="content-card cash-summary"><span>Alertes de stock</span><strong>{stockItems.filter((item) => item.quantity <= item.minimumQuantity).length}</strong><small>Stock au seuil minimum ou en dessous</small></article>
              <article className="content-card cash-summary"><span>Mouvements récents</span><strong>{stockMovements.length}</strong><small>Mouvements synchronisés sur le serveur</small></article>
            </div>
            <section className="content-card"><div className="section-heading"><div><h2>Inventaire de l’atelier</h2><p>Suivez les tissus et fournitures avec des unités adaptées.</p></div><button type="button" className="primary-button" onClick={() => setStockFormOpen((open) => !open)}>{stockFormOpen ? "Annuler" : "＋ Ajouter un article"}</button></div>
              {stockFormOpen && <form className="new-order-form" onSubmit={addStockItem}><label>Nom de l’article<input required maxLength={100} value={stockName} onChange={(event) => setStockName(event.target.value)} placeholder="Ex. tissu bazin" /></label><label>Unité<select value={stockUnit} onChange={(event) => setStockUnit(event.target.value)}><option>mètre</option><option>pièce</option><option>bobine</option><option>rouleau</option><option>paquet</option><option>kilogramme</option><option>litre</option><option>autre</option></select></label><label>Stock initial<input required type="number" min="0" step="any" inputMode="decimal" value={stockInitialQuantity} onChange={(event) => setStockInitialQuantity(event.target.value)} /></label><label>Seuil d’alerte<input required type="number" min="0" step="any" inputMode="decimal" value={stockMinimumQuantity} onChange={(event) => setStockMinimumQuantity(event.target.value)} /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStockFormOpen(false)}>Annuler</button><button type="submit" className="primary-button">Créer l’article</button></div></form>}
              {stockItems.length === 0 ? <div className="empty-state">Aucun article suivi. Ajoutez un tissu ou une fourniture pour commencer.</div> : <div className="table-wrap"><table><thead><tr><th>Article</th><th>Stock</th><th>Seuil</th><th>État</th><th>Action</th></tr></thead><tbody>{stockItems.map((item) => <tr key={item.id}><td><b>{item.name}</b><small>{item.unit}</small></td><td>{item.quantity} {item.unit}</td><td>{item.minimumQuantity} {item.unit}</td><td>{item.quantity <= item.minimumQuantity ? "À réapprovisionner" : "Disponible"}</td><td><div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setStockMovementItemId(item.id); setStockMovementType("Entrée"); setStockMovementQuantity(""); setStockMovementNote(""); }}>Entrée</button><button type="button" className="secondary-button" disabled={item.quantity <= 0} onClick={() => { setStockMovementItemId(item.id); setStockMovementType("Sortie"); setStockMovementQuantity(""); setStockMovementNote(""); }}>Sortie</button></div></td></tr>)}</tbody></table></div>}
              {stockMovementItemId && stockItems.some((item) => item.id === stockMovementItemId) && <form className="new-order-form" onSubmit={saveStockMovement}><h3>{stockMovementType} de stock — {stockItems.find((item) => item.id === stockMovementItemId)?.name}</h3><label>Type de mouvement<select value={stockMovementType} onChange={(event) => setStockMovementType(event.target.value as "Entrée" | "Sortie")}><option>Entrée</option><option>Sortie</option></select></label><label>Quantité ({stockItems.find((item) => item.id === stockMovementItemId)?.unit})<input required type="number" min="0.01" step="any" inputMode="decimal" value={stockMovementQuantity} onChange={(event) => setStockMovementQuantity(event.target.value)} /></label><label>Note (facultative)<input maxLength={120} value={stockMovementNote} onChange={(event) => setStockMovementNote(event.target.value)} placeholder="Ex. achat fournisseur ou commande client" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setStockMovementItemId(null)}>Annuler</button><button type="submit" className="primary-button">Enregistrer le mouvement</button></div></form>}
            </section>
            {isAtelierOwner ? <section className="content-card">
              <div className="section-heading"><div><h2>Achats fournisseurs</h2><p>Enregistrez une commande fournisseur, puis réceptionnez-la lorsque les fournitures arrivent.</p></div><button type="button" className="primary-button" disabled={stockItems.length === 0} onClick={() => setPurchaseFormOpen((open) => !open)}>{purchaseFormOpen ? "Annuler" : "＋ Nouvel achat"}</button></div>
              {supplierDirectory.length > 0 && <div className="supplier-directory-summary"><b>Répertoire de l’atelier · {supplierDirectory.length} fournisseur(s)</b><p>{supplierDirectory.map((item) => item.name + (item.city ? " · " + item.city : "")).join("  |  ")}</p></div>}
              {purchaseFormOpen && <form className="new-order-form" onSubmit={addSupplierPurchase}>
                <label>Fournisseur<input required maxLength={120} value={purchaseSupplierName} onChange={(event) => setPurchaseSupplierName(event.target.value)} placeholder="Ex. Mercerie Ndiaye" /></label>
                <div className="section-heading"><div><h3>Articles de l’achat</h3><p>Ajoutez chaque tissu ou fourniture avant d’enregistrer la commande.</p></div></div>
                <label>Article à acheter<select value={purchaseStockItemId} onChange={(event) => setPurchaseStockItemId(event.target.value)}><option value="">Choisir un article</option>{stockItems.filter((item) => !purchaseDraftLines.some((line) => line.stockItemId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
                <label>Quantité<input type="number" min="0.01" step="any" inputMode="decimal" value={purchaseQuantity} onChange={(event) => setPurchaseQuantity(event.target.value)} /></label>
                <label>Coût unitaire (FCFA)<input type="number" min="0" step="1" inputMode="numeric" value={purchaseUnitCost} onChange={(event) => setPurchaseUnitCost(event.target.value)} /></label>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={addPurchaseLine}>＋ Ajouter cet article</button></div>
                {purchaseDraftLines.length > 0 && <div className="table-wrap"><table><thead><tr><th>Article</th><th>Quantité</th><th>Coût unitaire</th><th>Total ligne</th><th>Action</th></tr></thead><tbody>{purchaseDraftLines.map((line) => <tr key={line.stockItemId}><td>{stockItems.find((item) => item.id === line.stockItemId)?.name ?? "Article inconnu"}</td><td>{line.quantity} {stockItems.find((item) => item.id === line.stockItemId)?.unit ?? ""}</td><td>{formatXof(line.unitCost)}</td><td>{formatXof(supplierPurchaseLineTotal(line))}</td><td><button type="button" className="text-button" onClick={() => setPurchaseDraftLines((current) => current.filter((item) => item.stockItemId !== line.stockItemId))}>Retirer</button></td></tr>)}</tbody><tfoot><tr><th colSpan={3}>Total estimé</th><th>{formatXof(purchaseDraftLines.reduce((sum, line) => sum + supplierPurchaseLineTotal(line), 0))}</th><th /></tr></tfoot></table></div>}
                <label>Note (facultative)<input maxLength={160} value={purchaseNote} onChange={(event) => setPurchaseNote(event.target.value)} placeholder="Saisir une référence ou une date de livraison" /></label>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setPurchaseFormOpen(false); setPurchaseDraftLines([]); setPurchaseSupplierName(""); setPurchaseNote(""); }}>Annuler</button><button type="submit" className="primary-button" disabled={purchaseDraftLines.length === 0}>Enregistrer l’achat</button></div>
              </form>}
              {supplierPurchases.length === 0 ? <div className="empty-state">Aucun achat fournisseur. Les achats enregistrés ici ne modifient pas le stock avant leur réception.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Fournisseur</th><th>Article</th><th>Montant</th><th>État</th><th>Action</th></tr></thead><tbody>{supplierPurchases.map((purchase) => <tr key={purchase.id}><td>{purchase.orderedAt}</td><td><b>{purchase.supplierName}</b><small>{purchase.note || purchase.id}</small></td><td>{purchase.lines.map((line) => <div key={line.stockItemId}>{stockItems.find((item) => item.id === line.stockItemId)?.name ?? "Article inconnu"} · {line.quantity}</div>)}</td><td>{formatXof(supplierPurchaseTotal(purchase))}<small>Payé : {formatXof(supplierPurchasePaidTotal(purchase))}</small><small>Reste dû : {formatXof(supplierPurchaseBalance(purchase))}</small>{purchase.payments?.map((payment) => <small key={payment.id}>{payment.paidAt} · {formatXof(payment.amount)}{payment.note ? " · " + payment.note : ""}</small>)}</td><td>{purchase.status}{purchase.receivedAt ? <small>Reçu le {purchase.receivedAt}</small> : null}{purchase.cancelledAt ? <small>Annulé le {purchase.cancelledAt}</small> : null}{purchase.cancelReason ? <small>Motif : {purchase.cancelReason}</small> : null}</td><td>{purchase.status !== "Annulée" ? <div className="form-actions">{supplierPurchaseBalance(purchase) > 0 ? <button type="button" className="secondary-button" onClick={() => { setSupplierPaymentPurchaseId(purchase.id); setSupplierPaymentAmount(""); }}>Enregistrer un règlement</button> : <small>Solde réglé</small>}{purchase.status === "À recevoir" ? <button type="button" className="secondary-button" onClick={() => receivePurchase(purchase.id)}>Confirmer la réception</button> : null}{purchase.status === "À recevoir" && supplierPurchasePaidTotal(purchase) === 0 ? <button type="button" className="text-button" onClick={() => { setPurchaseToCancelId(purchase.id); setPurchaseCancelReason(""); }}>Annuler l’achat</button> : null}</div> : "—"}</td></tr>)}</tbody></table></div>}
              {supplierPaymentPurchaseId && supplierPurchases.some((purchase) => purchase.id === supplierPaymentPurchaseId && purchase.status !== "Annulée" && supplierPurchaseBalance(purchase) > 0) && <form className="new-order-form" onSubmit={recordSupplierPurchasePayment}><h3>Règlement fournisseur · {supplierPurchases.find((purchase) => purchase.id === supplierPaymentPurchaseId)?.supplierName}</h3><p>Reste dû : {formatXof(supplierPurchaseBalance(supplierPurchases.find((purchase) => purchase.id === supplierPaymentPurchaseId)!))}. Le règlement n’enregistre pas la réception et ne modifie pas le stock.</p><label>Montant versé (FCFA)<input type="number" required min="1" step="1" inputMode="numeric" max={supplierPurchaseBalance(supplierPurchases.find((purchase) => purchase.id === supplierPaymentPurchaseId)!)} value={supplierPaymentAmount} onChange={(event) => setSupplierPaymentAmount(event.target.value)} /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setSupplierPaymentPurchaseId(null); setSupplierPaymentAmount(""); }}>Retour</button><button type="submit" className="primary-button">Enregistrer le règlement</button></div></form>}
              {purchaseToCancelId && supplierPurchases.some((purchase) => purchase.id === purchaseToCancelId && purchase.status === "À recevoir" && supplierPurchasePaidTotal(purchase) === 0) && <form className="new-order-form" onSubmit={cancelPurchase}><h3>Annuler l’achat {purchaseToCancelId}</h3><p>L’annulation sera conservée dans l’historique. Elle ne modifiera pas le stock.</p><label>Motif obligatoire<textarea required maxLength={240} rows={3} value={purchaseCancelReason} onChange={(event) => setPurchaseCancelReason(event.target.value)} placeholder="Indiquer pourquoi la commande doit être annulée" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => { setPurchaseToCancelId(null); setPurchaseCancelReason(""); }}>Retour</button><button type="submit" className="primary-button">Confirmer l’annulation</button></div></form>}
            </section> : <section className="content-card"><h2>Achats fournisseurs</h2><p>Les achats, coûts et règlements fournisseurs sont réservés au Propriétaire.</p></section>}
            <section className="content-card"><div className="section-heading"><div><h2>Historique des mouvements</h2><p>Les mouvements restent visibles pour comprendre les variations de stock.</p></div></div>{stockMovements.length === 0 ? <div className="empty-state">Aucun mouvement enregistré.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Article</th><th>Type</th><th>Quantité</th><th>Note</th></tr></thead><tbody>{stockMovements.slice(0, 100).map((movement) => <tr key={movement.id}><td>{movement.movedAt}</td><td>{stockItems.find((item) => item.id === movement.itemId)?.name ?? "Article inconnu"}</td><td>{movement.type}</td><td>{movement.quantity} {stockItems.find((item) => item.id === movement.itemId)?.unit ?? ""}</td><td>{movement.note || "—"}</td></tr>)}</tbody></table></div>}</section>
            <p className="privacy-note">Les achats peuvent regrouper plusieurs articles et leurs réceptions alimentent l’historique de stock. Les factures fournisseurs, paiements et synchronisation serveur restent à développer.</p>
          </section>}
          {view === "suppliers" && <section className="content-card supplier-page">
            <div className="section-heading"><div><h2>Profil fournisseur</h2><p>Renseignez les informations professionnelles de votre espace fournisseur.</p></div><span className="supplier-symbol"><NavIcon name="truck" /></span></div>
            <form className="supplier-form" onSubmit={saveSupplierProfile}>
              <label>Nom de l’entreprise<input required value={supplier.businessName} onChange={(event) => setSupplier((current) => ({ ...current, businessName: event.target.value }))} placeholder="Nom de votre entreprise" /></label>
              <label>Nom du contact<input value={supplier.contactName} onChange={(event) => setSupplier((current) => ({ ...current, contactName: event.target.value }))} placeholder="Nom du responsable" /></label>
              <label>Téléphone professionnel<input type="tel" value={supplier.phone} onChange={(event) => setSupplier((current) => ({ ...current, phone: event.target.value }))} placeholder="Téléphone de contact" /></label>
              <label>Ville ou zone de livraison<input value={supplier.city} onChange={(event) => setSupplier((current) => ({ ...current, city: event.target.value }))} placeholder="Ville ou zone desservie" /></label>
              <label>Catégorie de produits<select value={supplier.category} onChange={(event) => setSupplier((current) => ({ ...current, category: event.target.value }))}><option value="">Choisir une catégorie</option><option value="Tissus">Tissus</option><option value="Mercerie">Mercerie et accessoires</option><option value="Machines">Machines et équipements</option><option value="Autres">Autres fournitures</option></select></label>
              <label>Nom de la boutique<input value={supplier.shopName} onChange={(event) => setSupplier((current) => ({ ...current, shopName: event.target.value }))} placeholder="Nom public de la boutique" /></label>
              <label className="supplier-description">Description de l’offre<textarea value={supplier.description} onChange={(event) => setSupplier((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="Décrivez vos produits et services" /></label>
              <button type="submit" className="primary-button">Enregistrer le profil fournisseur</button>
            </form>
            <div className="supplier-shop-access"><div><span className="supplier-symbol"><NavIcon name="store" /></span><div><h3>Création de boutique</h3><p>Préparez votre boutique avec un nom public, une catégorie et une zone de livraison.</p></div></div><button className="secondary-button" onClick={() => { setSupplier((current) => ({ ...current, shopName: current.shopName || current.businessName })); setView("marketplace"); }}>Créer / gérer ma boutique <span>→</span></button></div>
            <p className="privacy-note">Le profil fournisseur et le carnet de fournisseurs sont enregistrés dans la base sécurisée de votre atelier. La publication publique du catalogue et les commandes marketplace restent à activer côté serveur.</p>
          </section>}
          {view === "marketplace" && <section className="marketplace-page">
            <div className="marketplace-hero content-card">
              <div className="marketplace-hero-copy"><p className="eyebrow">LA VITRINE YÉRÉ</p><h2>La mode rencontre ses clients. Les artisans trouvent leurs matières.</h2><p>Découvrez les créations des professionnels de la couture et les produits des fournisseurs au même endroit.</p></div>
              <div className="marketplace-hero-actions"><button type="button" className="primary-button" onClick={() => { setListingDraft({ ...emptyListing, sellerType: "tailor", sellerActivity: atelier.activity ?? "tailleur", category: "Vêtements prêts à vendre", sellerName: atelier.name, city: atelier.city }); setListingFormOpen(true); setNotice(""); }}>Vendre mes créations <span>→</span></button><button type="button" className="secondary-button" onClick={() => { setListingDraft({ ...emptyListing, sellerType: "supplier", category: "Tissus", sellerName: supplier.businessName, city: supplier.city }); setListingFormOpen(true); setNotice(""); }}>Vendre des fournitures</button></div>
            </div>
            {listingFormOpen && <form className="marketplace-listing-form content-card" onSubmit={saveMarketplaceListing}>
              <div className="section-heading"><div><p className="eyebrow">{editingListingId ? "MODIFIER UNE ANNONCE" : "NOUVELLE ANNONCE"}</p><h2>{editingListingId ? "Modifier votre annonce" : listingDraft.sellerType === "tailor" ? "Présenter une création à vendre" : "Ajouter un produit de mercerie"}</h2><p>Ajoutez plusieurs photos et revenez modifier cette fiche quand vous le souhaitez.</p></div><button type="button" className="marketplace-close" onClick={() => { setListingFormOpen(false); setEditingListingId(null); }} aria-label="Fermer le formulaire">×</button></div>
              <div className="marketplace-form-grid">
                <label>Je propose<select value={listingDraft.sellerType} onChange={(event) => setListingDraft((current) => ({ ...current, sellerType: event.target.value as MarketplaceListing["sellerType"], sellerActivity: event.target.value === "tailor" ? (atelier.activity ?? "tailleur") : undefined, category: event.target.value === "tailor" ? "Vêtements prêts à vendre" : "Tissus" }))}><option value="tailor">Mes vêtements / créations</option><option value="supplier">Des fournitures de couture</option></select></label>
                 
                <label>Catégorie<select value={listingDraft.category} onChange={(event) => setListingDraft((current) => ({ ...current, category: event.target.value }))}>{(listingDraft.sellerType === "tailor" ? ["Vêtements prêts à vendre", "Boubous & tenues traditionnelles", "Robes & ensembles", "Mode homme", "Mode femme", "Album de créations"] : ["Tissus", "Fils & pelotes", "Aiguilles & mercerie", "Boutons & fermetures", "Matériel de couture", "Épicerie & consommables"]).map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="marketplace-field-wide">Nom du produit ou de la création<input required value={listingDraft.title} onChange={(event) => setListingDraft((current) => ({ ...current, title: event.target.value }))} placeholder={listingDraft.sellerType === "tailor" ? "Ex. Ensemble bazin bleu cousu main" : "Ex. Bazin riche, rouleau de 5 mètres"} /></label>
                <label>Prix affiché<input required value={listingDraft.price} onChange={(event) => setListingDraft((current) => ({ ...current, price: event.target.value }))} placeholder="Ex. 25 000 FCFA" /></label>
                <label>Ville / zone<input value={listingDraft.city} onChange={(event) => setListingDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Saisir la ville ou la zone desservie, par exemple Dakar ou Thiès" /></label>
                <label>Nom professionnel / boutique<input required value={listingDraft.sellerName} onChange={(event) => setListingDraft((current) => ({ ...current, sellerName: event.target.value }))} placeholder="Nom professionnel ou boutique" /></label>
                <label className="marketplace-field-wide">Photos du produit ou de la création (4 maximum)<input type="file" accept="image/*" multiple onChange={addMarketplacePhotos} /><small>Choisissez des photos depuis votre téléphone ou votre ordinateur. Elles sont réduites pour limiter l’espace utilisé.</small></label>
                {(listingDraft.imageUrls ?? []).length > 0 && <div className="marketplace-photo-manager marketplace-field-wide"><strong>Photos enregistrées dans cette fiche</strong><div className="marketplace-photo-grid">{(listingDraft.imageUrls ?? []).map((photo, index) => <div className="marketplace-photo-item" key={`${index}-${photo.slice(0, 24)}`}><img src={photo} alt={`Photo ${index + 1} de l’annonce`} /><button type="button" className="marketplace-remove-photo" onClick={() => setListingDraft((current) => ({ ...current, imageUrls: (current.imageUrls ?? []).filter((_, photoIndex) => photoIndex !== index) }))}>Retirer</button></div>)}</div></div>}
                <label className="marketplace-field-wide">Adresse d’une photo en ligne (facultatif)<input type="url" value={listingDraft.imageUrl} onChange={(event) => setListingDraft((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="Coller l’adresse complète d’une photo déjà en ligne" /></label>
                <label className="marketplace-field-wide">Description<textarea rows={3} value={listingDraft.description} onChange={(event) => setListingDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Décrivez la matière, la taille, la couleur, la quantité disponible et le délai" /></label>
              </div>
              <div className="marketplace-form-footer"><p>Enregistrement local uniquement pour le moment. La publication publique et les commandes nécessitent le service marketplace.</p><div><button type="button" className="secondary-button" onClick={() => { setListingFormOpen(false); setEditingListingId(null); }}>Annuler</button><button className="primary-button" type="submit">{editingListingId ? "Enregistrer les modifications" : "Enregistrer l’annonce"} <span>→</span></button></div></div>
            </form>}
            <div className="marketplace-category-grid">
              <button type="button" className="marketplace-category-card fashion-category" onClick={() => { setListingDraft({ ...emptyListing, sellerType: "tailor", sellerActivity: atelier.activity ?? "tailleur", category: "Vêtements prêts à vendre", sellerName: atelier.name, city: atelier.city }); setListingFormOpen(true); setNotice(""); }}>
                <span className="marketplace-category-art"><NavIcon name="shirt" /></span><span className="marketplace-category-kicker">POUR LES PROFESSIONNELS DE LA COUTURE</span><strong>Mode & créations</strong><span className="marketplace-category-description">Boubous, ensembles, robes, tenues traditionnelles, prêt-à-porter et albums de créations.</span><span className="marketplace-category-link">Publier une création <b>→</b></span>
              </button>
              <button type="button" className="marketplace-category-card supplies-category" onClick={() => { setListingDraft({ ...emptyListing, sellerType: "supplier", category: "Tissus", sellerName: supplier.businessName, city: supplier.city }); setListingFormOpen(true); setNotice(""); }}>
                <span className="marketplace-category-art"><NavIcon name="package" /></span><span className="marketplace-category-kicker">POUR LES FOURNISSEURS</span><strong>Tissus & mercerie</strong><span className="marketplace-category-description">Tissus, fils, aiguilles, boutons, fermetures, accessoires et matériel de couture.</span><span className="marketplace-category-link">Publier une offre <b>→</b></span>
              </button>
            </div>
            <div className="marketplace-listing-heading"><div><p className="eyebrow">VITRINE</p><h2>Les annonces préparées</h2><p>Les créations et les fournitures, réunies dans un seul espace.</p></div><span className="marketplace-listing-count">{marketplaceListings.length} annonce{marketplaceListings.length === 1 ? "" : "s"}</span></div>
            {marketplaceListings.length === 0 ? <div className="marketplace-empty content-card"><span className="marketplace-empty-icon"><NavIcon name="store" /></span><h3>Votre vitrine commence ici</h3><p>Aucune annonce pour le moment. Ajoutez un vêtement prêt à vendre, un album de créations ou une fourniture utile aux professionnels de la couture.</p><button className="primary-button" onClick={() => { setListingDraft({ ...emptyListing, sellerName: atelier.name, city: atelier.city }); setListingFormOpen(true); setNotice(""); }}>Créer la première annonce <span>→</span></button></div> : <div className="marketplace-listing-grid">{marketplaceListings.map((listing) => { const photos = [...(listing.imageUrl ? [listing.imageUrl] : []), ...(listing.imageUrls ?? [])]; return <article className="marketplace-product-card content-card" key={listing.id}><div className="marketplace-card-photos">{photos.length ? photos.map((photo, index) => <img key={`${listing.id}-photo-${index}`} src={photo} alt={`${listing.title}, photo ${index + 1}`} loading="lazy" />) : <div className={listing.sellerType === "tailor" ? "marketplace-product-placeholder fashion" : "marketplace-product-placeholder supplies"}><NavIcon name={listing.sellerType === "tailor" ? "shirt" : "package"} /></div>}</div><div className="marketplace-product-copy"><span className={listing.sellerType === "tailor" ? "marketplace-product-type fashion" : "marketplace-product-type supplies"}>{listing.sellerType === "tailor" ? "MODE & CRÉATIONS" : "TISSUS & FOURNITURES"}</span><h3>{listing.title}</h3><p>{listing.description || listing.category}</p><strong>{listing.price}</strong><div className="marketplace-product-meta"><span>{listing.sellerName}</span><span>{listing.city || "Zone non précisée"}</span></div>{listing.sellerType === "tailor" && listing.sellerActivity && <span className="marketplace-activity-tag">Tailleur</span>}</div><div className="marketplace-card-actions"><button type="button" className="secondary-button" onClick={() => editMarketplaceListing(listing)}>Modifier</button><button className="marketplace-remove" type="button" onClick={() => setMarketplaceListings((current) => current.filter((item) => item.id !== listing.id))}>Retirer</button></div></article>; })}</div>}
            <p className="marketplace-local-note">Les annonces enregistrées ici sont visibles uniquement dans ce navigateur. Les comptes vendeurs, les photos hébergées, la publication publique, les paiements et les commandes en ligne seront raccordés au backend marketplace.</p>
          </section>}

          {view === "reminders" && <section className="reminders-page">
            <div className="reminders-intro content-card"><div className="reminders-intro-icon">↻</div><div><h2>Votre carnet de relance</h2><p>YÉRÉ repère les clients à recontacter à partir des dates de commande. Il suggère un message que vous pouvez relire et copier. Aucun message n’est envoyé automatiquement.</p></div></div>
            <div className="reminder-summary"><div><strong>{reminderSuggestions.length}</strong><span>suggestions à examiner</span></div><div><strong>{new Set(reminderSuggestions.map((item) => item.clientId)).size}</strong><span>clients concernés</span></div><p>Les dates et règles sont indicatives. Vérifiez le contexte avant chaque prise de contact.</p></div>
            {reminderSuggestions.length === 0 ? <div className="content-card empty-reminders"><h2>Pas de relance suggérée pour le moment</h2><p>Dès que vous enregistrerez des commandes avec une date, YÉRÉ pourra repérer les clients qui n’ont pas commandé récemment et les anciennes commandes liées à une occasion.</p></div> : <div className="reminder-list">{reminderSuggestions.map((item, index) => <article className="content-card reminder-card" key={item.clientId + "-" + item.kind + "-" + index}><div className="reminder-card-top"><span className={item.kind === "inactive" ? "reminder-kind inactive" : "reminder-kind occasion"}>{item.kind === "inactive" ? "À réactiver" : "Occasion à anticiper"}</span><span className="reminder-age">{item.daysSinceOrder} jours</span></div><h2>{item.title}</h2><p className="reminder-client-name">{item.clientName}</p><p className="reminder-detail">{item.detail}</p><div className="reminder-contact">{item.phone ? <span>☎ {item.phone}</span> : <span className="missing-phone">Téléphone non renseigné</span>}<span>Dernière commande : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.lastOrderAt + "T12:00:00"))}</span></div><div className="message-preview"><span>MESSAGE PROPOSÉ</span><p>{item.suggestedMessage}</p></div><button className="primary-button reminder-copy" disabled={!item.phone} onClick={() => { if (!navigator.clipboard?.writeText) { setNotice("La copie automatique n'est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte du message."); return; } void navigator.clipboard.writeText(item.suggestedMessage).then(() => setNotice("Message copié. Relisez-le et personnalisez-le avant de l'envoyer vous-même.")).catch(() => setNotice("Impossible de copier le message automatiquement. Sélectionnez le texte pour le copier manuellement.")); }}>Copier le message</button></article>)}</div>}
            <p className="privacy-note">Les suggestions sont calculées dans ce navigateur à partir des clients et commandes enregistrés ici. Aucun SMS, WhatsApp ou rappel programmé n’est envoyé.</p>
          </section>}
          {view !== "overview" && <footer className="footer"><span>YÉRÉ Atelier <span>·</span> La couture, mieux organisée.</span></footer>}
        </div>
      </main>
      {mobileMoreOpen && <div className="more-backdrop" role="presentation" onClick={() => setMobileMoreOpen(false)}>
        <section className="more-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title" onClick={(event) => event.stopPropagation()}>
          <span className="more-handle" aria-hidden="true" />
          <div className="more-heading"><div><span>VOTRE ESPACE ATELIER</span><h2 id="more-title">Encore plus d’outils</h2></div><button type="button" aria-label="Fermer le menu" onClick={() => setMobileMoreOpen(false)}>×</button></div>
          <div className="more-grid">{([{ id: "stock", label: "Stock", description: "Tissus et fournitures", icon: "package" }, { id: "account", label: "Mon atelier", description: "Profil et sauvegarde", icon: "user-round" }, { id: "reminders", label: "Relances clients", description: "Gardez le contact", icon: "bell-ring" }, { id: "suppliers", label: "Fournisseurs", description: "Votre réseau professionnel", icon: "truck" }, { id: "marketplace", label: "Marketplace", description: "Votre vitrine YÉRÉ", icon: "store" }] as { id: View; label: string; description: string; icon: string }[]).map((item) => <button type="button" key={item.id} className={view === item.id ? "more-item is-active" : "more-item"} onClick={() => { if (item.id === "account") openAccount(); else { setView(item.id); setMobileMoreOpen(false); } }}><span className="more-item-icon"><NavIcon name={item.icon} /></span><span><b>{item.label}</b><small>{item.description}</small></span><span className="more-item-arrow" aria-hidden="true">↗</span></button>)}</div>
        </section>
      </div>}
      <nav className="app-dock" aria-label="Navigation mobile">{mobileNavItems.map((item) => <button key={item.id} type="button" className={(item.id === "more" ? (mobileMoreOpen || ["stock", "account", "reminders", "suppliers", "marketplace"].includes(view)) : view === item.id) ? "dock-item is-active" : "dock-item"} onClick={() => { if (item.id === "more") setMobileMoreOpen((open) => !open); else { setView(item.id); setMobileMoreOpen(false); } }} aria-current={item.id !== "more" && view === item.id ? "page" : undefined} aria-expanded={item.id === "more" ? mobileMoreOpen : undefined}><span className="dock-icon"><NavIcon name={item.icon} /></span><small>{item.label}</small></button>)}</nav>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, ReactNode> = {
    house: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    "clipboard-list": <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1Z" /><path d="M9 10h6M9 14h6M9 18h3" /></>,
    truck: <><path d="M3 6h11v12H3z" /><path d="M14 10h4l3 3v5h-7z" /><circle cx="7.5" cy="19" r="1.5" /><circle cx="17.5" cy="19" r="1.5" /></>,
    shirt: <><path d="m16 3 5 3-3 5-3-2v12H9V9L6 11 3 6l5-3 2 2h4l2-2Z" /></>,
    store: <><path d="M3 10v10h18V10" /><path d="m2 10 2-7h16l2 7" /><path d="M2 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 2 2 0 0 0 2 0" /><path d="M9 20v-6h6v6" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 8h18" /><path d="M16 14h2" /></>,
    "user-round": <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    "user-filled": <><circle cx="12" cy="8" r="3.5" fill="currentColor" stroke="none" /><path d="M5.3 19.5a6.7 6.7 0 0 1 13.4 0c0 .8-.6 1.4-1.4 1.4H6.7c-.8 0-1.4-.6-1.4-1.4Z" fill="currentColor" stroke="none" /></>,
    "bell-ring": <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /><path d="M19 3l2 2M5 3 3 5" /></>,
    package: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8" /><path d="M12 13v9" /></>,
    "more-horizontal": <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
    "map-pin": <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    "thread-spool": <><ellipse cx="11.2" cy="3.7" rx="6.2" ry="2" /><path d="M6.1 4.8v13.6M16.3 4.8v13.6M6.1 18.4c-1.3.4-2 1-2 1.6 0 1.2 3.2 2.1 7.1 2.1s7.1-.9 7.1-2.1c0-.6-.7-1.2-2-1.6" /><path d="m6.3 8 9.9-2M6.3 11l9.9-2.2M6.3 14l9.9-2.2M6.3 17l9.9-2.2M6.5 19.5l9.5-2.1M17 14.8c2.3-.2 2.8 1.1 3 3.1.1 1 .8 1.7 1.7 1.9" /></>,
    "address-book": <><rect x="3.5" y="2.5" width="15" height="19" rx="1.7" /><path d="M6 2.5v16.2c0 1.2.7 2.3 2 2.3M6 18.7h12.5M20.3 3.4v17.2M20.3 5h1.2M20.3 8h1.2M20.3 11h1.2M20.3 14h1.2M20.3 17h1.2" /><circle cx="12" cy="8.4" r="2.1" /><path d="M8.8 15.3a3.2 3.2 0 0 1 6.4 0" /></>,
    "dress-form": <><path d="M10.2 3.1c0-.9.8-1.6 1.8-1.6s1.8.7 1.8 1.6v1.1l3 1.5c.8.4 1.1 1.2.8 2l-1.3 3.2c-.5 1.2-.5 2.2 0 3.4l1.2 2.7c.4.9-.2 1.8-1.1 1.8H7.6c-.9 0-1.5-.9-1.1-1.8l1.2-2.7c.5-1.2.5-2.2 0-3.4L6.4 7.7c-.3-.8 0-1.6.8-2l3-1.5V3.1ZM12 18.8v2.7M8.7 22h6.6" /></>,
    "cash-notes": <><path d="m4 8.5 13.8-3.2c.7-.2 1.4.3 1.5 1l.4 1.7M5.7 6.3l12.5-2.8M4.1 10.3h15.8c.8 0 1.4.6 1.4 1.4v7.2c0 .8-.6 1.4-1.4 1.4H4.1c-.8 0-1.4-.6-1.4-1.4v-7.2c0-.8.6-1.4 1.4-1.4Z" /><path d="M6.2 13.1c0 .9-.5 1.4-1.3 1.5v1.5c.8.1 1.3.6 1.3 1.5h11.6c0-.9.5-1.4 1.3-1.5v-1.5c-.8-.1-1.3-.6-1.3-1.5H6.2Z" /><circle cx="12" cy="15.3" r="1.6" /></>,
    "tailor-scissors": <><circle cx="5.8" cy="18.2" r="2.7" /><circle cx="17" cy="18.2" r="2.7" /><path d="M7.8 16.2 17.7 3.4c.4-.6 1.2-.5 1.5.1.3.7.1 1.4-.3 2.1L8.5 19M15 16.2 5.1 3.4c-.4-.6-1.2-.5-1.5.1-.3.7-.1 1.4.3 2.1L14.3 19" /><circle cx="11.4" cy="11.7" r=".7" /><path d="M19 10.7h3v4h-3M20.5 10.7v1.2M20.5 13.3v1.4" /></>
  };
  return <svg {...common}>{paths[name] ?? paths.store}</svg>;
}

function Onboarding({ atelier, onAtelierChange, onCancel, onFinish }: {
  atelier: AtelierProfile;
  onAtelierChange: (value: AtelierProfile) => void;
  onCancel: () => void;
  onFinish: () => void;
}) {
  const [draft, setDraft] = useState<AtelierProfile>(() => normalizeAtelierProfile(atelier));
  function update(field: "name" | "phone" | "city", value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }
  return <main className="onboarding-shell">
    <header className="onboarding-brand"><span className="brand-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span><button type="button" className="onboarding-back" onClick={onCancel}>← Retour à l’accueil</button></header>
    <div className="onboarding-layout onboarding-layout-simple">
      <section className="onboarding-copy">
        <p className="eyebrow">CONFIGURATION</p>
        <h1>Configurez votre espace YÉRÉ</h1>
        <h2>Un seul outil, adapté à votre métier.</h2>
        <p className="onboarding-body">YÉRÉ est conçu pour les tailleurs. Configurez votre atelier et votre façon de travailler.</p>
        <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); onAtelierChange(normalizeAtelierProfile(draft)); onFinish(); }}>
          <div className="profile-profession" aria-label="Métier YÉRÉ"><span>Métier</span><strong>Tailleur</strong><small>YÉRÉ est réservé aux tailleurs pour son lancement.</small></div>
          
          <label>Comment travaillez-vous ?
            <select required value={draft.workMode ?? "independent"} onChange={(event) => setDraft((previous) => ({ ...previous, workMode: event.target.value as WorkMode }))}>
              {workModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
          </label>
          <label>Nom de l'atelier ou de votre activité<input required value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Nom de l'atelier ou de l'activité" /></label>
          <label>Téléphone<input type="tel" value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Téléphone" /></label>
          <label>Ville<input value={draft.city} onChange={(event) => update("city", event.target.value)} placeholder="Ville" /></label>
          <button className="primary-button onboarding-primary" type="submit">Créer mon espace YÉRÉ <span>→</span></button>
        </form>
        <p className="onboarding-privacy">Prototype : les données sont conservées dans ce navigateur. Aucun compte serveur n'est créé. N’utilisez pas encore de données réelles.</p>
      </section>
    </div>
  </main>;
}

function OrderTable({ orders, clients, onStatusChange, onRetouchStageChange, onView, showFinancials = true }: { orders: Order[]; clients: Client[]; onStatusChange: (id: string, status: OrderStatus) => void; onRetouchStageChange: (id: string, stage: RetouchStage) => void; onView?: (order: Order) => void; showFinancials?: boolean }) {
  const measurementLabel = (order: Order) => {
    const measurement = order.measurementSnapshot;
    if (!measurement) return "Non disponible pour cette ancienne commande";
    const details = [
      measurement.garmentType,
      measurement.bust && `Poitrine ${measurement.bust} cm`,
      measurement.waist && `Taille ${measurement.waist} cm`,
      measurement.hips && `Hanches ${measurement.hips} cm`,
      measurement.shoulder && `Épaules ${measurement.shoulder} cm`,
      measurement.sleeve && `Manche ${measurement.sleeve} cm`,
      measurement.length && `Longueur ${measurement.length} cm`,
      measurement.arm && `Bras ${measurement.arm} cm`,
      measurement.neck && `Cou ${measurement.neck} cm`,
      measurement.thigh && `Cuisse ${measurement.thigh} cm`,
      measurement.legLength && `Entrejambe ${measurement.legLength} cm`
    ].filter(Boolean);
    return details.join(" · ") || "Aucune mensuration renseignée à la création";
  };
  const getStatusClass = (status: OrderStatus) => status === "Prêt" ? "ready" : status === "En confection" ? "progress" : status === "Livré" ? "delivered" : "todo";
  const formatDueDate = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(date + "T12:00:00"));
  const statusControl = (order: Order) => <select className={"status-select status-" + getStatusClass(order.status)} value={order.status} aria-label={"Statut de " + order.id} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>;
  const retouchStageControl = (order: Order) => order.kind !== "retouche" ? null : <label className="retouch-stage-control">Étape retouche<select value={order.retouchStage ?? "À examiner"} aria-label={"Étape de retouche de " + order.id} onChange={(event) => onRetouchStageChange(order.id, event.target.value as RetouchStage)}>{retouchStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label>;

  return <div className="orders-display">
    <div className="table-wrap orders-desktop"><table><thead><tr><th>COMMANDE</th><th>CLIENT</th><th>DATE DE LIVRAISON</th>{showFinancials ? <><th>PRIX</th><th>RESTE DÛ</th></> : null}<th>STATUT</th></tr></thead><tbody>{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <tr key={order.id}><td><b className="order-id">{order.id}</b><small className="table-secondary">{order.kind === "retouche" ? "Retouche · " : ""}{order.garment}</small><small className="table-secondary">{order.measurementSnapshotAt ? "Mesures du " + formatDueDate(order.measurementSnapshotAt) + " · " : ""}{measurementLabel(order)}</small></td><td><span className="table-client">{client?.name ?? "Client supprimé"}</span></td><td>{formatDueDate(order.dueDate)}</td>{showFinancials ? <><td>{formatXof(order.price)}</td><td><b className={balanceDue(order) === 0 ? "paid" : ""}>{formatXof(balanceDue(order))}</b></td></> : null}<td>{statusControl(order)}{retouchStageControl(order)}</td></tr>; })}</tbody></table></div>
    <div className="order-card-list" role="group" aria-label="Commandes sous forme de cartes">{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <article className="order-card" key={order.id}><div className="order-card-heading"><div><b className="order-id">{order.id}</b><strong>{order.kind === "retouche" ? "Retouche · " : ""}{order.garment}</strong></div><span className={"order-status-chip status-" + getStatusClass(order.status)}>{order.status}</span></div><p className="order-card-client"><span>Client</span><b>{client?.name ?? "Client supprimé"}</b></p><p className="order-card-client"><span>Mensurations à la commande</span><b>{measurementLabel(order)}</b></p>{order.kind === "retouche" && <p className="order-card-client"><span>Étape retouche</span><b>{order.retouchStage ?? "À examiner"}</b></p>}{retouchStageControl(order)}<div className="order-card-details"><div><span>Livraison</span><b>{formatDueDate(order.dueDate)}</b></div>{showFinancials ? <div><span>À encaisser</span><b className={balanceDue(order) === 0 ? "paid" : "order-balance"}>{formatXof(balanceDue(order))}</b></div> : null}</div>{onView && <button type="button" className="order-view-button" onClick={() => onView(order)}>Voir la commande <span aria-hidden="true">→</span></button>}</article>; })}</div>
    {orders.length === 0 && <div className="empty-state">Aucune commande pour le moment. Créez votre première commande pour commencer.</div>}
  </div>;
}

export default App;
