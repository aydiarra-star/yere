import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { balanceDue, formatXof, getClientReminderSuggestions, getDailyTasks, isClientListValid, isMeasurementValid, isOrderInputValid, isOrderListValid, matchesClient, orderStatuses, saveMeasurementVersion, type Client, type Measurement, type Order, type OrderStatus } from "./domain";
import { usePersistentState } from "./usePersistentState";

const emptyMeasurement: Measurement = { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: "" };

const initialClients: Client[] = [
  { id: "c-1", name: "Aïssatou Ndiaye", phone: "+221 77 123 45 67", createdAt: "2026-10-22", measurement: { bust: "92", waist: "74", hips: "100", shoulder: "38", sleeve: "58", length: "145", note: "Préférence : coupe ample" } },
  { id: "c-2", name: "Mamadou Ba", phone: "+221 76 234 56 78", createdAt: "2026-10-23", measurement: { bust: "98", waist: "86", hips: "102", shoulder: "44", sleeve: "62", length: "150", note: "Boubou traditionnel" } },
  { id: "c-3", name: "Fatou Sarr", phone: "+221 70 345 67 89", createdAt: "2026-10-25", measurement: { bust: "88", waist: "70", hips: "96", shoulder: "36", sleeve: "56", length: "138", note: "" } },
  { id: "c-4", name: "Mariama Diallo", phone: "+221 77 456 78 90", createdAt: "2025-10-01", measurement: { bust: "90", waist: "72", hips: "98", shoulder: "37", sleeve: "57", length: "142", note: "Tenue de cérémonie" } }
];

const initialOrders: Order[] = [
  { id: "YR-1024", clientId: "c-1", garment: "Ensemble deux pièces", dueDate: "2026-10-29", orderedAt: "2026-10-20", price: 35000, deposit: 20000, status: "En confection" },
  { id: "YR-1025", clientId: "c-2", garment: "Boubou brodé", dueDate: "2026-10-30", orderedAt: "2026-10-22", price: 45000, deposit: 15000, status: "À préparer" },
  { id: "YR-1026", clientId: "c-3", garment: "Robe sur mesure", dueDate: "2026-10-27", orderedAt: "2026-10-24", price: 25000, deposit: 25000, status: "Prêt" },
  { id: "YR-1027", clientId: "c-4", garment: "Tenue de mariage", dueDate: "2025-11-01", orderedAt: "2025-10-01", price: 50000, deposit: 50000, status: "Livré" }
];

type View = "overview" | "clients" | "orders" | "cash" | "account" | "reminders";
type AtelierProfile = { name: string; phone: string; city: string };
const emptyAtelier: AtelierProfile = { name: "", phone: "", city: "" };

function isAtelierProfileValid(value: unknown): value is AtelierProfile {
  return typeof value === "object" && value !== null
    && "name" in value && typeof value.name === "string"
    && "phone" in value && typeof value.phone === "string"
    && "city" in value && typeof value.city === "string";
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const [clients, setClients] = usePersistentState<Client[]>("yere-demo-clients-v1", [], isClientListValid);
  const [orders, setOrders] = usePersistentState<Order[]>("yere-demo-orders-v1", [], isOrderListValid);
  const [atelier, setAtelier] = usePersistentState<AtelierProfile>("yere-demo-atelier-v1", emptyAtelier, isAtelierProfileValid);
  const [onboardingComplete, setOnboardingComplete] = usePersistentState<boolean>("yere-demo-onboarding-complete-v1", false, isBooleanValue);
  const [onboardingStartedAt, setOnboardingStartedAt] = usePersistentState<number | null>("yere-demo-onboarding-started-at-v1", null, isNullableTimestamp);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [newOrderClientId, setNewOrderClientId] = useState("");
  const [newOrderGarment, setNewOrderGarment] = useState("");
  const [newOrderDueDate, setNewOrderDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [newOrderPrice, setNewOrderPrice] = useState("");
  const [newOrderDeposit, setNewOrderDeposit] = useState("0");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [draftMeasurement, setDraftMeasurement] = useState<Measurement>({ ...emptyMeasurement });
  const [notice, setNotice] = useState("Démonstration : données conservées localement sur cet appareil, sans synchronisation serveur.");

  useEffect(() => {
    if (onboardingStartedAt === null) setOnboardingStartedAt(Date.now());
  }, [onboardingStartedAt, setOnboardingStartedAt]);

  const visibleClients = useMemo(() => clients.filter((client) => matchesClient(client, query)), [clients, query]);
  const outstanding = orders.reduce((sum, order) => sum + balanceDue(order), 0);
  const outstandingOrderCount = orders.filter((order) => balanceDue(order) > 0).length;
  const selected = clients.find((client) => client.id === selectedClient);
  const reminderSuggestions = useMemo(
    () => getClientReminderSuggestions(clients, orders, new Date().toISOString().slice(0, 10)),
    [clients, orders]
  );

  // Assistant quotidien : règles métier testées séparément, données locales uniquement.
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(today);
  const dailyTasks = useMemo(() => getDailyTasks(clients, orders, todayKey), [clients, orders, todayKey]);
  const dailyTaskCount = dailyTasks.length;

  useEffect(() => {
    const client = clients.find((item) => item.id === selectedClient);
    setDraftMeasurement(client ? { ...client.measurement } : { ...emptyMeasurement });
  }, [selectedClient, clients]);

  function addClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = clientName.trim();
    if (!name) return;
    const client: Client = {
      id: `c-${Date.now()}`,
      name,
      phone: clientPhone.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
      measurement: { ...emptyMeasurement }
    };
    setClients((current) => [client, ...current]);
    setNewOrderClientId(client.id);
    setClientName("");
    setClientPhone("");
    setShowForm(false);
    setView("clients");
    setSelectedClient(client.id);
    const firstClientMessage = clients.length === 0 && onboardingStartedAt !== null
      ? (Date.now() - onboardingStartedAt <= 180000
          ? " Première action réussie en moins de 3 minutes : objectif d'adoption atteint dans cette démonstration."
          : " Le premier client a été créé après 3 minutes : ce parcours doit être examiné pour simplifier l'adoption.")
      : "";
    setNotice(`Fiche de ${name} créée dans la démonstration.${firstClientMessage}`);
  }

  function addOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(newOrderPrice);
    const deposit = Number(newOrderDeposit);
    if (!isOrderInputValid({ clientId: newOrderClientId, garment: newOrderGarment, dueDate: newOrderDueDate, price, deposit }, clients.map((client) => client.id))) {
      setNotice("Vérifiez le client, le vêtement, la date de livraison, le prix et l'acompte. Les montants doivent être des nombres entiers positifs, et l'acompte ne peut pas dépasser le prix.");
      return;
    }
    const order: Order = {
      id: `YR-${Date.now()}`,
      clientId: newOrderClientId,
      garment: newOrderGarment.trim(),
      dueDate: newOrderDueDate,
      orderedAt: new Date().toISOString().slice(0, 10),
      price,
      deposit,
      status: "À préparer"
    };
    setOrders((current) => [order, ...current]);
    setNewOrderGarment("");
    setNewOrderPrice("");
    setNewOrderDeposit("0");
    setShowOrderForm(false);
    setNotice("Première commande créée dans le stockage local de la démonstration. Aucune sauvegarde serveur n'est active.");
  }

  function exportLocalBackup() {
    const backup = {
      format: "yere-local-backup",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: { clients, orders, atelier, onboardingComplete, onboardingStartedAt }
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
    setNotice("Export préparé. Conservez ce fichier dans un endroit sûr : il contient des données clients et mensurations.");
  }

  function importLocalBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    void file.text().then((raw) => {
      const parsed: unknown = JSON.parse(raw);
      if (!isObjectRecord(parsed) || parsed.format !== "yere-local-backup" || parsed.schemaVersion !== 1 || !isObjectRecord(parsed.data)) {
        throw new Error("Format de sauvegarde YÉRÉ non reconnu.");
      }
      const data = parsed.data;
      if (!isClientListValid(data.clients)
        || !isOrderListValid(data.orders)
        || !isAtelierProfileValid(data.atelier)
        || !isBooleanValue(data.onboardingComplete)
        || !isNullableTimestamp(data.onboardingStartedAt)) {
        throw new Error("La sauvegarde est incomplète ou contient des données invalides. Aucune donnée n'a été modifiée.");
      }
      setClients(data.clients);
      setOrders(data.orders);
      setAtelier(data.atelier);
      setOnboardingComplete(data.onboardingComplete);
      setOnboardingStartedAt(data.onboardingStartedAt);
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

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
  }

  function updateMeasurement(field: keyof Measurement, value: string) {
    setDraftMeasurement((current) => ({ ...current, [field]: value }));
  }

  function saveMeasurements(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (!isMeasurementValid(draftMeasurement)) {
      setNotice("Chaque mensuration doit être un nombre positif ou nul.");
      return;
    }
    const measuredAt = new Date().toISOString().slice(0, 10);
    const versionId = `m-${Date.now()}`;
    setClients((current) => current.map((client) => client.id === selected.id
      ? saveMeasurementVersion(client, draftMeasurement, measuredAt, versionId)
      : client));
    setNewOrderClientId(selected.id);
    setShowOrderForm(true);
    setView("orders");
    setNotice(`Mensurations de ${selected.name} enregistrées localement. Troisième étape : créez maintenant une commande.`);
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Accueil", icon: "⌂" },
    { id: "clients", label: "Clients", icon: "♙" },
    { id: "orders", label: "Commandes", icon: "▤" },
    { id: "cash", label: "Caisse", icon: "₣" },
    { id: "account", label: "Compte", icon: "●" },
    { id: "reminders", label: "Relances clients", icon: "↻" }
  ];
  const mobileNavItems = navItems.filter((item) => item.id !== "reminders");

  if (!onboardingComplete) {
    return <Onboarding
      atelier={atelier}
      onAtelierChange={setAtelier}
      onFinish={() => {
        setOnboardingComplete(true);
        setView("clients");
        setShowForm(true);
        setNotice("Atelier configuré dans cette démonstration locale. Créez votre premier client pour continuer.");
      }}
      onExploreDemo={() => {
        setClients(initialClients);
        setOrders(initialOrders);
        setOnboardingComplete(true);
        setView("overview");
        setNotice("Données fictives chargées pour explorer la démonstration. N'utilisez pas de vraies données clients.");
      }}
    />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("overview"); }}>
          <span className="brand-mark">Y</span>
          <span><strong>YÉRÉ</strong><small>ATELIER</small></span>
        </a>
        <div className="atelier-switch"><span className="atelier-avatar">A</span><span><b>{atelier.name || "Atelier Démo"}</b><small>{atelier.city || "Compte de démonstration"}</small></span><span className="chevron">⌄</span></div>
        <p className="nav-caption">ESPACE ATELIER</p>
        <nav aria-label="Navigation principale">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "clients" && <span className="nav-count">{clients.length}</span>}{item.id === "reminders" && reminderSuggestions.length > 0 && <span className="nav-count">{reminderSuggestions.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><b>Un atelier mieux organisé.</b><p>Vos clients, leurs mesures et vos commandes au même endroit.</p></div><div className="profile"><span className="profile-avatar">AD</span><span><b>{atelier.name || "Atelier Démo"}</b><small>Mode aperçu</small></span><span className="dots">···</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">YÉRÉ <span>/</span> Atelier <span>/</span> <b>{navItems.find((item) => item.id === view)?.label}</b></div><div className="topbar-right"><span className="demo-pill"><i /> Démonstration</span><span className="demo-pill" role="status" aria-live="polite"><i /> {isOnline ? "En ligne" : "Hors ligne"}</span><button className="avatar-button" aria-label="Profil de démonstration">AD</button></div></header>
        <div className="page-wrap">
          <div className="welcome-row"><div><p className="eyebrow">{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p><h1>{view === "overview" ? "Votre atelier, en un coup d’œil." : view === "clients" ? "Vos clients & mensurations" : view === "orders" ? "Suivi des commandes" : view === "cash" ? "La caisse de votre atelier" : view === "account" ? (atelier.name || "Votre compte atelier") : "Faites revenir vos clients."}</h1><p className="page-subtitle">{view === "overview" ? "Gardez le fil de vos commandes et de votre activité." : view === "clients" ? "Retrouvez les fiches clients et leurs dernières mesures." : view === "orders" ? "Suivez chaque pièce, de la préparation à la livraison." : view === "cash" ? "Aperçu indicatif des acomptes et soldes, pas encore un journal de caisse complet." : view === "account" ? "Les informations de cet atelier sur cet appareil." : "Des occasions concrètes de reprendre contact, sans envoyer de message automatiquement."}</p></div><button className="primary-button" onClick={() => { setShowForm(true); setView("clients"); }}><span>＋</span> Nouveau client</button></div>
          {notice && <div className="notice" role="status"><span aria-hidden="true">ⓘ</span><p>{notice}</p><button aria-label="Fermer le message" onClick={() => setNotice("")}>×</button></div>}

          {view === "overview" && <>
            <section className="daily-assistant content-card" aria-labelledby="daily-assistant-title">
              <div className="section-heading">
                <div><p className="eyebrow">VOTRE PRIORITÉ DU JOUR</p><h2 id="daily-assistant-title">Que dois-je faire aujourd'hui ?</h2><p>{todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)} · suggestions calculées depuis les commandes enregistrées sur cet appareil.</p></div>
                <span className="daily-count">{dailyTaskCount} action{dailyTaskCount > 1 ? "s" : ""}</span>
              </div>
              {dailyTasks.length > 0 ? <ul className="daily-task-list">{dailyTasks.slice(0, 6).map((task) => <li key={task.id} className={`daily-task ${task.kind}`}><span className="daily-task-marker" aria-hidden="true">{task.kind === "critical" ? "!" : task.kind === "money" ? "₣" : "→"}</span><span className="daily-task-copy"><b>{task.title}</b><small>{task.detail}</small></span><button className="text-button" onClick={() => setView(task.action)}>{task.action === "cash" ? "Voir la caisse" : "Voir la commande"} <span>→</span></button></li>)}</ul> : <div className="daily-empty"><b>Aucune urgence détectée dans les données disponibles.</b><p>Les commandes, paiements et stocks non enregistrés ici ne sont pas pris en compte.</p><button className="secondary-button" onClick={() => setView("orders")}>Vérifier les commandes</button></div>}
              {dailyTaskCount > 6 && <p className="daily-overflow">Et {dailyTaskCount - 6} autre{dailyTaskCount - 6 > 1 ? "s" : ""} action{dailyTaskCount - 6 > 1 ? "s" : ""} à consulter dans les commandes et la caisse.</p>}
              <p className="daily-disclaimer">Aide indicative du prototype : les données restent locales, ne sont pas synchronisées et peuvent être incomplètes. Vérifiez les échéances avec votre cahier.</p>
            </section>
            <section className="stats-grid" aria-label="Indicateurs de l'atelier">
              <article className="stat-card"><div className="stat-top"><span>Commandes en cours</span><span className="stat-icon green">▤</span></div><strong>{orders.filter((order) => order.status !== "Livré").length.toString().padStart(2, "0")}</strong><small><span className="stat-dot green-dot" /> À suivre cette semaine</small></article>
              <article className="stat-card"><div className="stat-top"><span>Clients de l’atelier</span><span className="stat-icon purple">♙</span></div><strong>{clients.length.toString().padStart(2, "0")}</strong><small>Vos fiches et mensurations</small></article>
              <article className="stat-card"><div className="stat-top"><span>À encaisser</span><span className="stat-icon amber">₣</span></div><strong className="money-stat">{formatXof(outstanding)}</strong><small>Solde restant sur {outstandingOrderCount} commande{outstandingOrderCount > 1 ? "s" : ""}</small></article>
            </section>
            <section className="content-card">
              <div className="section-heading"><div><h2>Commandes à suivre</h2><p>Les dernières pièces de votre atelier</p></div><button className="text-button" onClick={() => setView("orders")}>Toutes les commandes <span>→</span></button></div>
              <OrderTable orders={orders.slice(0, 3)} clients={clients} onStatusChange={updateStatus} />
            </section>
            <section className="bottom-grid"><div className="content-card quick-card"><div className="section-heading"><div><h2>Accès rapide</h2><p>Les actions du quotidien</p></div></div><div className="quick-actions"><button onClick={() => { setShowForm(true); setView("clients"); }}><span className="quick-icon green">＋</span><span><b>Ajouter un client</b><small>Créer une fiche client</small></span><span className="quick-arrow">→</span></button><button onClick={() => setView("clients")}><span className="quick-icon purple">↗</span><span><b>Retrouver des mesures</b><small>Consulter les fiches existantes</small></span><span className="quick-arrow">→</span></button></div></div><div className="tip-card"><span className="tip-spark">✳</span><p className="eyebrow">LE CONSEIL YÉRÉ</p><h2>Une bonne couture commence par une bonne mesure.</h2><p>Conservez les mensurations de chaque client pour gagner du temps lors de sa prochaine commande.</p></div></section>
          </>}

          {view === "clients" && <section className="content-card clients-card"><div className="section-heading"><div><h2>Répertoire clients</h2><p>{clients.length} fiche{clients.length > 1 ? "s" : ""} dans cet atelier</p></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou téléphone…" aria-label="Rechercher un client" /></label></div>
            {showForm && <form className="new-client-form" onSubmit={addClient}><div><h3>Créer une fiche client</h3><p>Les mensurations pourront être complétées ensuite.</p></div><label>Nom complet<input required autoFocus value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Ex. Mariama Diallo" /></label><label>Téléphone<input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+221 77 000 00 00" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button">Enregistrer le client</button></div></form>}
            <div className="client-list">{visibleClients.map((client, index) => <button key={client.id} className={selectedClient === client.id ? "client-row selected" : "client-row"} onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}><span className={`client-avatar avatar-${index % 4}`}>{client.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="client-main"><b>{client.name}</b><small>{client.phone || "Pas de téléphone renseigné"}</small></span><span className="client-measurements"><b>{Object.values(client.measurement).filter(Boolean).length - (client.measurement.note ? 1 : 0)}/6</b><small>mesures saisies</small></span><span className="row-chevron">›</span></button>)}
              {visibleClients.length === 0 && <div className="empty-state"><span>⌕</span><b>Aucun client trouvé</b><p>Essayez un autre nom ou numéro.</p></div>}
            </div>
            {selected && <div className="measurement-panel"><div className="section-heading"><div><h2>Mensurations de {selected.name}</h2><p>Dernière fiche de mesures enregistrée en démonstration</p></div><span className="demo-pill">Exemple</span></div><form className="measurement-form" onSubmit={saveMeasurements}><div className="measurement-grid">{[["Tour de poitrine","bust"],["Tour de taille","waist"],["Tour de hanches","hips"],["Épaules","shoulder"],["Longueur de manche","sleeve"],["Longueur du vêtement","length"]].map(([label, key]) => <label className="measure-field" key={key}><span>{label} (cm)</span><input type="number" min="0" step="any" inputMode="decimal" aria-label={label} value={draftMeasurement[key as keyof Measurement] as string} onChange={(event) => updateMeasurement(key as keyof Measurement, event.target.value)} placeholder="—" /></label>)}</div><label className="measure-notes-field">Notes pour la prochaine commande<textarea value={draftMeasurement.note} onChange={(event) => updateMeasurement("note", event.target.value)} placeholder="Préférences, coupe, tissu…" rows={2} /></label><div className="form-actions"><button type="submit" className="primary-button">Enregistrer les mensurations</button></div></form><section className="measurement-history" aria-label="Historique des mensurations"><h3>Historique des prises de mesures</h3>{(selected.measurementHistory ?? []).length === 0 ? <p className="history-empty">Aucune prise de mesures enregistrée. Complétez les champs puis enregistrez une première version.</p> : <ol>{[...(selected.measurementHistory ?? [])].reverse().map((version) => <li key={version.id}><b>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(version.measuredAt + "T12:00:00"))}</b><span>{[version.measurement.bust && `Poitrine ${version.measurement.bust}`, version.measurement.waist && `Taille ${version.measurement.waist}`, version.measurement.hips && `Hanches ${version.measurement.hips}`].filter(Boolean).join(" · ") || "Notes uniquement"}</span></li>)}</ol>}</section><p className="privacy-note">Prototype uniquement : l'historique est conservé dans le stockage local de ce navigateur, sans compte ni sauvegarde serveur. N'utilise pas de données clients réelles.</p></div>}
          </section>}

          {view === "orders" && <section className="content-card"><div className="section-heading"><div><h2>Commandes de l’atelier</h2><p>Modifiez le statut pour tester le suivi de production.</p></div><button className="primary-button" onClick={() => { setShowOrderForm((value) => !value); setNewOrderClientId(selectedClient ?? clients[0]?.id ?? ""); }}>＋ Nouvelle commande</button></div>
            {showOrderForm && <form className="new-order-form" onSubmit={addOrder}>
              <h3>Créer une commande</h3>
              <label>Client<select required value={newOrderClientId} onChange={(event) => setNewOrderClientId(event.target.value)}><option value="">Choisir un client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
              <label>Vêtement / création<input required value={newOrderGarment} onChange={(event) => setNewOrderGarment(event.target.value)} placeholder="Ex. Boubou brodé" /></label>
              <label>Date de livraison<input required type="date" value={newOrderDueDate} onChange={(event) => setNewOrderDueDate(event.target.value)} /></label>
              <label>Prix convenu (FCFA)<input required type="number" min="1" step="1" value={newOrderPrice} onChange={(event) => setNewOrderPrice(event.target.value)} placeholder="25000" /></label>
              <label>Acompte reçu (FCFA)<input required type="number" min="0" step="1" value={newOrderDeposit} onChange={(event) => setNewOrderDeposit(event.target.value)} /></label>
              <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowOrderForm(false)}>Annuler</button><button type="submit" className="primary-button" disabled={clients.length === 0}>Enregistrer la commande</button></div>
              {clients.length === 0 && <p className="history-empty">Créez d'abord un client pour lui associer une commande.</p>}
            </form>}
            <OrderTable orders={orders} clients={clients} onStatusChange={updateStatus} /></section>}


          {view === "cash" && <section className="cash-page">
            <div className="cash-summary-grid">
              <article className="content-card cash-summary"><span>Reste à encaisser</span><strong>{formatXof(outstanding)}</strong><small>Calculé à partir des commandes enregistrées dans ce prototype</small></article>
              <article className="content-card cash-summary"><span>Acomptes enregistrés</span><strong>{formatXof(orders.reduce((sum, order) => sum + order.deposit, 0))}</strong><small>Somme des acomptes des commandes visibles ici</small></article>
            </div>
            <section className="content-card"><div className="section-heading"><div><h2>Situation par commande</h2><p>Montant dû = prix convenu moins acompte enregistré.</p></div></div>
              {orders.length === 0 ? <div className="empty-state">Aucune commande pour le moment. Créez une commande pour commencer à suivre les montants.</div> : <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Prix</th><th>Acompte</th><th>Reste</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.garment}</b><small>{clients.find((client) => client.id === order.clientId)?.name || "Client inconnu"}</small></td><td>{formatXof(order.price)}</td><td>{formatXof(order.deposit)}</td><td><b>{formatXof(balanceDue(order))}</b></td></tr>)}</tbody></table></div>}
            </section>
            <p className="privacy-note">Cette vue est un aperçu des montants des commandes. Les encaissements multiples, dépenses, rapprochement de caisse, écritures et rapports financiers restent à développer. Ne l'utilisez pas comme comptabilité officielle.</p>
          </section>}

          {view === "account" && <section className="content-card account-page">
            <div className="section-heading"><div><h2>Profil de l'atelier</h2><p>Informations enregistrées localement sur cet appareil.</p></div><span className="demo-pill"><i /> Prototype local</span></div>
            <form className="account-form" onSubmit={(event) => { event.preventDefault(); setNotice("Profil d'atelier mis à jour sur cet appareil uniquement."); }}>
              <label>Nom de l'atelier<input required value={atelier.name} onChange={(event) => setAtelier((current) => ({ ...current, name: event.target.value }))} /></label>
              <label>Téléphone<input value={atelier.phone} onChange={(event) => setAtelier((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label>Ville<input value={atelier.city} onChange={(event) => setAtelier((current) => ({ ...current, city: event.target.value }))} /></label>
              <button type="submit" className="primary-button">Enregistrer le profil</button>
            </form>
            <section className="backup-panel" aria-labelledby="backup-title">
              <div><h3 id="backup-title">Sauvegarde locale</h3><p>Exportez vos fiches, mensurations, commandes et profil. La restauration remplace les données actuellement enregistrées sur cet appareil.</p></div>
              <div className="backup-actions">
                <button type="button" className="primary-button" onClick={exportLocalBackup}>Exporter une sauvegarde (.json)</button>
                <label className="secondary-button backup-import-label" htmlFor="yere-backup-file">Restaurer une sauvegarde</label>
                <input id="yere-backup-file" className="backup-file-input" type="file" accept=".json,application/json" onChange={importLocalBackup} />
              </div>
              <p className="privacy-note">Attention : le fichier exporté contient des informations personnelles. Gardez-le hors d’accès public. Avant restauration, exportez les données actuelles si vous souhaitez les conserver.</p>
            </section>
            <div className="account-secondary"><div><b>Relances clients</b><p>Consultez les suggestions de relance manuelle, sans envoi automatique.</p></div><button className="secondary-button" onClick={() => setView("reminders")}>Ouvrir les relances →</button></div>
            <p className="privacy-note">Aucun compte distant, synchronisation ni sauvegarde serveur n'est actif dans cette version.</p>
          </section>}
          {view === "reminders" && <section className="reminders-page">
            <div className="reminders-intro content-card"><div className="reminders-intro-icon">↻</div><div><h2>Votre carnet de relance</h2><p>YÉRÉ repère les clients à recontacter à partir des commandes datées et propose un message que vous pouvez relire et copier. Rien n'est envoyé automatiquement.</p></div></div>
            <div className="reminder-summary"><div><strong>{reminderSuggestions.length}</strong><span>suggestions à examiner</span></div><div><strong>{new Set(reminderSuggestions.map((item) => item.clientId)).size}</strong><span>clients concernés</span></div><p>Les dates et règles sont indicatives. Vérifiez le contexte avant chaque prise de contact.</p></div>
            {reminderSuggestions.length === 0 ? <div className="content-card empty-reminders"><h2>Pas de relance suggérée pour le moment</h2><p>Quand des commandes datées seront enregistrées, YÉRÉ pourra repérer les clients sans commande récente ou les anciennes commandes liées à une occasion.</p></div> : <div className="reminder-list">{reminderSuggestions.map((item, index) => <article className="content-card reminder-card" key={item.clientId + "-" + item.kind + "-" + index}><div className="reminder-card-top"><span className={item.kind === "inactive" ? "reminder-kind inactive" : "reminder-kind occasion"}>{item.kind === "inactive" ? "À réactiver" : "Occasion à anticiper"}</span><span className="reminder-age">{item.daysSinceOrder} jours</span></div><h2>{item.title}</h2><p className="reminder-client-name">{item.clientName}</p><p className="reminder-detail">{item.detail}</p><div className="reminder-contact">{item.phone ? <span>☎ {item.phone}</span> : <span className="missing-phone">Téléphone non renseigné</span>}<span>Dernière commande : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.lastOrderAt + "T12:00:00"))}</span></div><div className="message-preview"><span>MESSAGE PROPOSÉ</span><p>{item.suggestedMessage}</p></div><button className="primary-button reminder-copy" disabled={!item.phone} onClick={() => { if (!navigator.clipboard?.writeText) { setNotice("La copie automatique n'est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte du message."); return; } void navigator.clipboard.writeText(item.suggestedMessage).then(() => setNotice("Message copié. Relisez-le et personnalisez-le avant de l'envoyer vous-même.")).catch(() => setNotice("Impossible de copier le message automatiquement. Sélectionnez le texte pour le copier manuellement.")); }}>Copier le message</button></article>)}</div>}
            <p className="privacy-note">Prototype uniquement : les suggestions sont calculées dans ce navigateur à partir des données de démonstration. Aucun SMS, WhatsApp ou rappel programmé n'est envoyé.</p>
          </section>}
          <footer className="footer"><span>YÉRÉ Atelier <span>·</span> La couture, mieux organisée.</span><span>Prototype de démonstration · stockage local uniquement</span></footer>
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">{mobileNavItems.map((item) => <button key={item.id} className={view === item.id ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>
    </div>
  );
}

function Onboarding({ atelier, onAtelierChange, onFinish, onExploreDemo }: {
  atelier: AtelierProfile;
  onAtelierChange: (value: AtelierProfile) => void;
  onFinish: () => void;
  onExploreDemo: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AtelierProfile>(atelier);
  const steps = [
    { eyebrow: "BIENVENUE", title: "YÉRÉ Atelier", subtitle: "La couture, mieux organisée.", body: "Retrouvez vos clients, leurs mensurations, vos commandes et vos paiements en un seul endroit.", detail: "Un outil de travail pensé pour le quotidien de votre atelier." },
    { eyebrow: "GAGNEZ DU TEMPS", title: "Fini les cahiers perdus et les recherches interminables.", subtitle: "Tout retrouver en quelques secondes.", body: "Mensurations, anciennes commandes, acomptes et dates de livraison : les informations utiles sont réunies.", detail: "Moins de recherches, moins d'oublis et moins d'erreurs de saisie." },
    { eyebrow: "SUIVI DE PRODUCTION", title: "Gardez chaque commande sous contrôle.", subtitle: "De la coupe à la livraison.", body: "Suivez les étapes de confection : coupe, couture, essayage et livraison.", detail: "Le prototype illustre le suivi. Les alertes automatiques de retard restent à développer." },
    { eyebrow: "GESTION DE L'ARGENT", title: "Comprenez ce que votre atelier gagne réellement.", subtitle: "Des chiffres plus clairs.", body: "Préparez le suivi des acomptes, paiements, dépenses et recettes.", detail: "Dans cette version de démonstration, les indicateurs financiers restent limités aux commandes et soldes simulés." },
    { eyebrow: "INSPIRATIONS COUTURE", title: "Retrouvez les modèles au bon moment.", subtitle: "Un outil de travail, pas un réseau social.", body: "À terme, classez les photos envoyées par les clients, les modèles enregistrés et les créations réalisées.", detail: "Le catalogue d'inspirations est prévu dans la feuille de route ; il n'est pas encore disponible." },
    { eyebrow: "VOTRE ATELIER", title: "Créons votre premier atelier.", subtitle: "Quelques informations pour commencer.", body: "Renseignez le nom de votre atelier, un téléphone et une ville. Vous pourrez ensuite créer votre premier client.", detail: "Prototype : ces informations restent sur cet appareil. Aucun compte ni sauvegarde serveur n'est créé." }
  ];
  const current = steps[step];
  const isSetup = step === steps.length - 1;
  function update(field: keyof AtelierProfile, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }
  return <main className="onboarding-shell">
    <header className="onboarding-brand"><span className="brand-mark">Y</span><span><strong>YÉRÉ</strong><small>ATELIER</small></span><span className="onboarding-step">Étape {step + 1} sur {steps.length}</span></header>
    <div className="onboarding-layout">
      <section className="onboarding-copy">
        <p className="eyebrow">{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <h2>{current.subtitle}</h2>
        <p className="onboarding-body">{current.body}</p>
        {step === 1 && <ul className="onboarding-benefits"><li>Mensurations</li><li>Anciennes commandes</li><li>Acomptes</li><li>Dates de livraison</li></ul>}
        {step === 2 && <div className="onboarding-flow"><span>Coupe</span><b>→</b><span>Couture</span><b>→</b><span>Essayage</span><b>→</b><span>Livraison</span></div>}
        {step === 3 && <ul className="onboarding-benefits"><li>Acomptes</li><li>Paiements</li><li>Dépenses</li><li>Recettes</li></ul>}
        {step === 4 && <div className="onboarding-inspiration"><span>✦</span><div><b>Vos références couture</b><small>Photos, modèles et créations — fonctionnalité prévue, pas encore active.</small></div></div>}
        {isSetup && <form className="onboarding-form" onSubmit={(event) => { event.preventDefault(); onAtelierChange(draft); onFinish(); }}>
          <label>Nom de l'atelier<input required autoFocus value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="Ex. Atelier Aminata" /></label>
          <label>Téléphone<input value={draft.phone} onChange={(event) => update("phone", event.target.value)} placeholder="+221 77 000 00 00" /></label>
          <label>Ville<input value={draft.city} onChange={(event) => update("city", event.target.value)} placeholder="Ex. Dakar" /></label>
          <button className="primary-button onboarding-primary" type="submit">Commencer à utiliser YÉRÉ <span>→</span></button>
        </form>}
        {!isSetup && <p className="onboarding-detail">{current.detail}</p>}
        <div className="onboarding-actions">
          {step > 0 && <button className="secondary-button" onClick={() => setStep((value) => value - 1)}>Précédent</button>}
          {!isSetup && <button className="primary-button onboarding-primary" onClick={() => setStep((value) => Math.min(value + 1, steps.length - 1))}>{step === 0 ? "Commencer" : "Continuer"} <span>→</span></button>}
        </div>
        {step === 0 && <button className="onboarding-demo-link" onClick={onExploreDemo}>Explorer la démonstration avec des exemples</button>}
        <p className="onboarding-disclaimer">Démonstration uniquement · stockage local · ne pas saisir de vraies données clients</p>
      </section>
      <aside className="onboarding-visual" aria-label="Illustration conceptuelle d'un atelier de couture organisé">
        <div className="visual-glow"></div><div className="visual-card visual-phone"><span className="visual-phone-top"></span><b>YÉRÉ Atelier</b><small>Vos commandes</small><div className="visual-task"><i></i><span>Tenue de cérémonie<small>En confection</small></span></div><div className="visual-task"><i></i><span>Boubou brodé<small>Essayage</small></span></div><div className="visual-task"><i></i><span>Robe sur mesure<small>À livrer</small></span></div></div>
        <div className="visual-card visual-notebook"><span>FICHE CLIENT</span><b>Mensurations</b><div className="visual-lines"></div><div className="visual-lines short"></div><div className="visual-lines"></div><small>Retrouvées en quelques secondes</small></div>
        <div className="visual-fabric fabric-one"></div><div className="visual-fabric fabric-two"></div><div className="visual-scissors">✂</div><p>Un atelier mieux organisé,<br/>sans perdre le fil.</p>
      </aside>
    </div>
  </main>;
}

function OrderTable({ orders, clients, onStatusChange }: { orders: Order[]; clients: Client[]; onStatusChange: (id: string, status: OrderStatus) => void }) {
  const getStatusClass = (status: OrderStatus) => status === "Prêt" ? "ready" : status === "En confection" ? "progress" : status === "Livré" ? "delivered" : "todo";
  const formatDueDate = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00"));
  const statusControl = (order: Order) => <select className={`status-select status-${getStatusClass(order.status)}`} value={order.status} aria-label={`Statut de ${order.id}`} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>;

  return <div className="orders-display">
    <div className="table-wrap orders-desktop"><table><thead><tr><th>COMMANDE</th><th>CLIENT</th><th>DATE DE LIVRAISON</th><th>PRIX</th><th>RESTE DÛ</th><th>STATUT</th></tr></thead><tbody>{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <tr key={order.id}><td><b className="order-id">{order.id}</b><small className="table-secondary">{order.garment}</small></td><td><span className="table-client">{client?.name ?? "Client supprimé"}</span></td><td>{formatDueDate(order.dueDate)}</td><td>{formatXof(order.price)}</td><td><b className={balanceDue(order) === 0 ? "paid" : ""}>{formatXof(balanceDue(order))}</b></td><td>{statusControl(order)}</td></tr>; })}</tbody></table></div>
    <div className="order-card-list" aria-label="Commandes sous forme de cartes">{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <article className="order-card" key={order.id}><div className="order-card-heading"><div><b className="order-id">{order.id}</b><strong>{order.garment}</strong></div>{statusControl(order)}</div><p className="order-card-client">{client?.name ?? "Client supprimé"}</p><div className="order-card-details"><div><span>Livraison</span><b>{formatDueDate(order.dueDate)}</b></div><div><span>Prix</span><b>{formatXof(order.price)}</b></div><div><span>À encaisser</span><b className={balanceDue(order) === 0 ? "paid" : "order-balance"}>{formatXof(balanceDue(order))}</b></div></div></article>; })}</div>
    {orders.length === 0 && <div className="empty-state">Aucune commande pour le moment.</div>}
  </div>;
}

export default App;
