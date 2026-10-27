import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { balanceDue, formatXof, getClientReminderSuggestions, getDailyTasks, isClientListValid, isMeasurementValid, isOrderInputValid, isOrderListValid, matchesClient, orderStatuses, saveMeasurementVersion, type Client, type Measurement, type Order, type OrderStatus } from "./domain";
import { usePersistentState } from "./usePersistentState";

const emptyMeasurement: Measurement = { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: "" };


type View = "overview" | "clients" | "orders" | "cash" | "account" | "marketplace" | "reminders";
type AtelierProfile = { name: string; phone: string; city: string };
const emptyAtelier: AtelierProfile = { name: "", phone: "", city: "" };
type IconName = "home" | "users" | "package" | "shopping-bag" | "wallet" | "user-round";

function AppIcon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" {...common}>
    {name === "home" && <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>}
    {name === "users" && <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}
    {name === "package" && <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" /></>}
    {name === "shopping-bag" && <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>}
    {name === "wallet" && <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M16 14h.01M7 5V3h11" /></>}
    {name === "user-round" && <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1Z" /></>}
  </svg>;
}

function TailorLogo() {
  return <svg className="brand-mark" viewBox="0 0 48 48" role="img" aria-label="Logo YÉRÉ, atelier de couture">
    <rect x="1" y="1" width="46" height="46" rx="14" fill="currentColor" />
    <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 12h14M19 12v5l-2 3v12a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V20l-2-3v-5" />
      <path d="M17 20h14M18 25h12M18 30h12" />
      <path d="M34 10c-3 3-3 6-1 8l-8 10" />
      <circle cx="33" cy="9" r="1.5" />
    </g>
  </svg>;
}

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
  const [clients, setClients] = usePersistentState<Client[]>("yere-clients-v1", [], isClientListValid);
  const [orders, setOrders] = usePersistentState<Order[]>("yere-orders-v1", [], isOrderListValid);
  const [atelier, setAtelier] = usePersistentState<AtelierProfile>("yere-atelier-v1", emptyAtelier, isAtelierProfileValid);
  const [onboardingComplete, setOnboardingComplete] = usePersistentState<boolean>("yere-onboarding-complete-v1", false, isBooleanValue);
  const [onboardingStartedAt, setOnboardingStartedAt] = usePersistentState<number | null>("yere-onboarding-started-at-v1", null, isNullableTimestamp);
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
  const [notice, setNotice] = useState("");

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
          ? " Première action réussie en moins de 3 minutes : parcours d’accueil rapide."
          : " Le premier client a été créé après 3 minutes : le parcours peut encore être simplifié.")
      : "";
    setNotice(`Fiche de ${name} créée sur cet appareil.${firstClientMessage}`);
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
    setNotice("Première commande enregistrée sur cet appareil. Aucune synchronisation serveur n’est active.");
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

  const navItems: { id: View; label: string; icon: IconName }[] = [
    { id: "overview", label: "Accueil", icon: "home" },
    { id: "clients", label: "Clients", icon: "users" },
    { id: "orders", label: "Commandes", icon: "package" },
    { id: "marketplace", label: "Marketplace", icon: "shopping-bag" },
    { id: "cash", label: "Caisse", icon: "wallet" },
    { id: "account", label: "Compte", icon: "user-round" },
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
        setNotice("Profil d’atelier enregistré sur cet appareil. La connexion sécurisée n’est pas encore activée.");
      }}
     />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("overview"); }}>
          <TailorLogo />
          <span><strong>YÉRÉ</strong><small>ATELIER</small></span>
        </a>
        <button type="button" className="atelier-switch" onClick={() => setView("account")} aria-label="Ouvrir le profil de l’atelier"><span className="atelier-avatar">A</span><span><b>{atelier.name || "Mon atelier"}</b><small>{atelier.city || "Configurer mon espace"}</small></span><span className="chevron">⌄</span></button>
        <p className="nav-caption">ESPACE ATELIER</p>
        <nav aria-label="Navigation principale">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span className="nav-icon"><AppIcon name={item.icon} size={22} /></span>{item.label}{item.id === "clients" && <span className="nav-count">{clients.length}</span>}{item.id === "reminders" && reminderSuggestions.length > 0 && <span className="nav-count">{reminderSuggestions.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><b>Un atelier mieux organisé.</b><p>Vos clients, leurs mesures et vos commandes au même endroit.</p></div><button type="button" className="profile profile-button" onClick={() => setView("account")} aria-label="Gérer le compte de l’atelier"><span className="profile-avatar">Y</span><span><b>{atelier.name || "Mon atelier"}</b><small>Gérer mon espace</small></span><span className="dots">→</span></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb" aria-label="Fil d’Ariane"><span className="breadcrumb-brand">YÉRÉ</span><span>/</span><span>Atelier</span><span>/</span><b>{navItems.find((item) => item.id === view)?.label}</b></div><div className="topbar-right"><button className="avatar-button" aria-label="Ouvrir le compte de l’atelier" onClick={() => setView("account")}>Y</button></div></header>
        <div className="page-wrap">
          <div className={view === "overview" ? "welcome-row overview-welcome" : "welcome-row"}><div><p className="eyebrow">{view === "overview" ? "VOTRE ATELIER AUJOURD’HUI" : todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}</p><h1>{view === "overview" ? "Bonjour Abdoulaye 👋" : view === "clients" ? "Vos clients & mensurations" : view === "orders" ? "Suivi des commandes" : view === "cash" ? "La caisse de votre atelier" : view === "account" ? (atelier.name || "Votre compte atelier") : view === "marketplace" ? "La marketplace YÉRÉ" : "Faites revenir vos clients."}</h1><p className="page-subtitle">{view === "overview" ? "Voici les priorités de votre atelier pour aujourd’hui." : view === "clients" ? "Retrouvez les fiches clients et leurs dernières mesures." : view === "orders" ? "Suivez chaque pièce, de la préparation à la livraison." : view === "cash" ? "Suivez les acomptes et les montants à récupérer." : view === "account" ? "Votre profil d’atelier." : view === "marketplace" ? "Préparez votre vitrine et développez votre activité." : "Des occasions concrètes de reprendre contact avec vos clients."}</p>{view === "overview" && <div className="today-snapshot" aria-label="Résumé de la journée"><div className="snapshot-item"><span className="snapshot-icon">✓</span><span><b>{orders.filter((order) => order.dueDate === todayKey && order.status !== "Livré").length} livraison{orders.filter((order) => order.dueDate === todayKey && order.status !== "Livré").length === 1 ? "" : "s"}</b><small>prévue aujourd’hui</small></span></div><div className="snapshot-item"><span className="snapshot-icon money">₣</span><span><b>{formatXof(outstanding)}</b><small>à encaisser</small></span></div><div className="snapshot-item"><span className="snapshot-icon orders">▣</span><span><b>{orders.filter((order) => order.status !== "Livré").length} commande{orders.filter((order) => order.status !== "Livré").length === 1 ? "" : "s"}</b><small>en cours</small></span></div></div>}</div><button className="primary-button welcome-action" onClick={() => { if (view === "overview") { setNewOrderClientId(selectedClient ?? clients[0]?.id ?? ""); setShowOrderForm(true); setView("orders"); } else { setShowForm(true); setView("clients"); } }}><span>＋</span> {view === "overview" ? "Nouvelle commande" : "Nouveau client"}</button></div>
          {notice && view !== "overview" && <div className="notice" role="status"><span aria-hidden="true">ⓘ</span><p>{notice}</p><button aria-label="Fermer le message" onClick={() => setNotice("")}>×</button></div>}

          {view === "overview" && <>
            <section className="daily-assistant content-card" aria-labelledby="daily-assistant-title">
              <div className="section-heading">
                <div><p className="eyebrow">LES PRIORITÉS</p><h2 id="daily-assistant-title">Que dois-je faire aujourd’hui ?</h2><p>Les prochaines actions pour garder le rythme de l’atelier.</p></div>
                <span className="daily-count">{dailyTaskCount} action{dailyTaskCount > 1 ? "s" : ""}</span>
              </div>
              {dailyTasks.length > 0 ? <ul className="daily-task-list">{dailyTasks.slice(0, 6).map((task) => <li key={task.id} className={`daily-task ${task.kind}`}><span className="daily-task-marker" aria-hidden="true">{task.kind === "critical" ? "!" : task.kind === "money" ? "₣" : "→"}</span><span className="daily-task-copy"><b>{task.title}</b><small>{task.detail}</small></span><button className="text-button" onClick={() => setView(task.action)}>{task.action === "cash" ? "Voir la caisse" : "Voir la commande"} <span>→</span></button></li>)}</ul> : <div className="daily-empty"><b>Tout est à jour pour le moment.</b><p>Vous pouvez vérifier vos prochaines livraisons ou créer une nouvelle commande.</p><button className="secondary-button" onClick={() => setView("orders")}>Vérifier les commandes</button></div>}
              {dailyTaskCount > 6 && <p className="daily-overflow">Et {dailyTaskCount - 6} autre{dailyTaskCount - 6 > 1 ? "s" : ""} action{dailyTaskCount - 6 > 1 ? "s" : ""} à consulter dans les commandes et la caisse.</p>}
              
            </section>
            <section className="stats-grid" aria-label="Indicateurs de l'atelier">
              <article className="stat-card"><div className="stat-top"><span>Commandes en cours</span><span className="stat-icon green">▤</span></div><strong>{orders.filter((order) => order.status !== "Livré").length.toString().padStart(2, "0")}</strong><small><span className="stat-dot green-dot" /> À suivre cette semaine</small></article>
              <article className="stat-card"><div className="stat-top"><span>Clients de l’atelier</span><span className="stat-icon purple">♙</span></div><strong>{clients.length.toString().padStart(2, "0")}</strong><small>Vos fiches et mensurations</small></article>
              <article className="stat-card"><div className="stat-top"><span>À encaisser</span><span className="stat-icon amber">₣</span></div><strong className="money-stat">{formatXof(outstanding)}</strong><small>Solde restant sur {outstandingOrderCount} commande{outstandingOrderCount > 1 ? "s" : ""}</small></article>
            </section>
            <section className="content-card">
              <div className="section-heading"><div><h2>Commandes à suivre</h2><p>Les dernières pièces de votre atelier</p></div><button className="text-button" onClick={() => setView("orders")}>Toutes les commandes <span>→</span></button></div>
              <OrderTable orders={orders.slice(0, 3)} clients={clients} onStatusChange={updateStatus} onView={() => setView("orders")} />
            </section>
            <section className="bottom-grid"><div className="content-card quick-card"><div className="section-heading"><div><h2>Accès rapide</h2><p>Les actions du quotidien</p></div></div><div className="quick-actions"><button onClick={() => { setShowForm(true); setView("clients"); }}><span className="quick-icon green">＋</span><span><b>Ajouter un client</b><small>Créer une fiche client</small></span><span className="quick-arrow">→</span></button><button onClick={() => setView("clients")}><span className="quick-icon purple">↗</span><span><b>Retrouver des mesures</b><small>Consulter les fiches existantes</small></span><span className="quick-arrow">→</span></button></div></div><div className="tip-card"><span className="tip-spark">✳</span><p className="eyebrow">LE CONSEIL YÉRÉ</p><h2>Une bonne couture commence par une bonne mesure.</h2><p>Conservez les mensurations de chaque client pour gagner du temps lors de sa prochaine commande.</p></div></section>
          </>}

          {view === "clients" && <section className="content-card clients-card"><div className="section-heading"><div><h2>Répertoire clients</h2><p>{clients.length} fiche{clients.length > 1 ? "s" : ""} dans cet atelier</p></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou téléphone…" aria-label="Rechercher un client" /></label></div>
            {showForm && <form className="new-client-form" onSubmit={addClient}><div><h3>Créer une fiche client</h3><p>Les mensurations pourront être complétées ensuite.</p></div><label>Nom complet<input required autoFocus value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Ex. Mariama Diallo" /></label><label>Téléphone<input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+221 77 000 00 00" /></label><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" className="primary-button">Enregistrer le client</button></div></form>}
            <div className="client-list">{visibleClients.map((client, index) => <button key={client.id} className={selectedClient === client.id ? "client-row selected" : "client-row"} onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}><span className={`client-avatar avatar-${index % 4}`}>{client.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span className="client-main"><b>{client.name}</b><small>{client.phone || "Pas de téléphone renseigné"}</small></span><span className="client-measurements"><b>{Object.values(client.measurement).filter(Boolean).length - (client.measurement.note ? 1 : 0)}/6</b><small>mesures saisies</small></span><span className="row-chevron">›</span></button>)}
              {visibleClients.length === 0 && <div className="empty-state"><span>⌕</span><b>Aucun client trouvé</b><p>Essayez un autre nom ou numéro.</p></div>}
            </div>
            {selected && <div className="measurement-panel"><div className="section-heading"><div><h2>Mensurations de {selected.name}</h2><p>Dernière fiche de mesures enregistrée</p></div> </div><form className="measurement-form" onSubmit={saveMeasurements}><div className="measurement-grid">{[["Tour de poitrine","bust"],["Tour de taille","waist"],["Tour de hanches","hips"],["Épaules","shoulder"],["Longueur de manche","sleeve"],["Longueur du vêtement","length"]].map(([label, key]) => <label className="measure-field" key={key}><span>{label} (cm)</span><input type="number" min="0" step="any" inputMode="decimal" aria-label={label} value={draftMeasurement[key as keyof Measurement] as string} onChange={(event) => updateMeasurement(key as keyof Measurement, event.target.value)} placeholder="—" /></label>)}</div><label className="measure-notes-field">Notes pour la prochaine commande<textarea value={draftMeasurement.note} onChange={(event) => updateMeasurement("note", event.target.value)} placeholder="Préférences, coupe, tissu…" rows={2} /></label><div className="form-actions"><button type="submit" className="primary-button">Enregistrer les mensurations</button></div></form><section className="measurement-history" aria-label="Historique des mensurations"><h3>Historique des prises de mesures</h3>{(selected.measurementHistory ?? []).length === 0 ? <p className="history-empty">Aucune prise de mesures enregistrée. Complétez les champs puis enregistrez une première version.</p> : <ol>{[...(selected.measurementHistory ?? [])].reverse().map((version) => <li key={version.id}><b>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(version.measuredAt + "T12:00:00"))}</b><span>{[version.measurement.bust && `Poitrine ${version.measurement.bust}`, version.measurement.waist && `Taille ${version.measurement.waist}`, version.measurement.hips && `Hanches ${version.measurement.hips}`].filter(Boolean).join(" · ") || "Notes uniquement"}</span></li>)}</ol>}</section><p className="privacy-note">Prototype uniquement : l'historique est conservé dans le stockage local de ce navigateur, sans compte ni sauvegarde serveur. N'utilise pas de données clients réelles.</p></div>}
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
              <article className="content-card cash-summary"><span>Reste à encaisser</span><strong>{formatXof(outstanding)}</strong><small>Calculé à partir des commandes enregistrées</small></article>
              <article className="content-card cash-summary"><span>Acomptes enregistrés</span><strong>{formatXof(orders.reduce((sum, order) => sum + order.deposit, 0))}</strong><small>Somme des acomptes des commandes enregistrées</small></article>
            </div>
            <section className="content-card"><div className="section-heading"><div><h2>Situation par commande</h2><p>Montant dû = prix convenu moins acompte enregistré.</p></div></div>
              {orders.length === 0 ? <div className="empty-state">Aucune commande pour le moment. Créez une commande pour commencer à suivre les montants.</div> : <div className="table-wrap"><table><thead><tr><th>Commande</th><th>Prix</th><th>Acompte</th><th>Reste</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.garment}</b><small>{clients.find((client) => client.id === order.clientId)?.name || "Client inconnu"}</small></td><td>{formatXof(order.price)}</td><td>{formatXof(order.deposit)}</td><td><b>{formatXof(balanceDue(order))}</b></td></tr>)}</tbody></table></div>}
            </section>
            <p className="privacy-note">Cette vue est un aperçu des montants des commandes. Les encaissements multiples, dépenses, rapprochement de caisse, écritures et rapports financiers restent à développer. Ne l'utilisez pas comme comptabilité officielle.</p>
          </section>}

          {view === "account" && <section className="content-card account-page">
            <div className="section-heading account-section-heading"><div><h2>Compte et profil de l’atelier</h2><p>Modifiez les informations de votre espace YÉRÉ.</p></div></div>
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
            <p className="privacy-note">Compte en ligne non activé : les données restent sur cet appareil jusqu’à la connexion du service sécurisé YÉRÉ.</p>
          </section>}
          {view === "marketplace" && <section className="marketplace-page">
            <div className="marketplace-hero content-card"><div className="marketplace-mark">◇</div><div><p className="eyebrow">VOTRE VITRINE PROFESSIONNELLE</p><h2>Faites découvrir vos créations.</h2><p>Préparez votre présence sur la marketplace YÉRÉ. Cette première version vous permet d’organiser votre atelier ; la publication publique et les ventes en ligne ne sont pas encore activées.</p><div className="marketplace-actions"><button className="primary-button" onClick={() => setView("account")}>Compléter mon atelier <span>→</span></button><button className="secondary-button" onClick={() => { setShowOrderForm(true); setNewOrderClientId(selectedClient ?? clients[0]?.id ?? ""); setView("orders"); }}>Créer une commande</button></div></div></div>
            <div className="marketplace-grid"><article className="content-card marketplace-tile"><span className="marketplace-tile-icon">✂</span><h3>Vos créations</h3><p>Préparez les pièces que vous souhaitez présenter à vos futurs clients.</p><button className="text-button" onClick={() => setView("orders")}>Voir mes commandes <span>→</span></button></article><article className="content-card marketplace-tile"><span className="marketplace-tile-icon">♙</span><h3>Votre clientèle</h3><p>Retrouvez vos clients et entretenez la relation avant d’ouvrir les ventes publiques.</p><button className="text-button" onClick={() => setView("clients")}>Ouvrir les clients <span>→</span></button></article><article className="content-card marketplace-tile"><span className="marketplace-tile-icon">⌂</span><h3>Profil de boutique</h3><p>Renseignez le nom et la ville de l’atelier pour préparer votre vitrine.</p><button className="text-button" onClick={() => setView("account")}>Gérer le profil <span>→</span></button></article></div>
          </section>}

          {view === "reminders" && <section className="reminders-page">
            <div className="reminders-intro content-card"><div className="reminders-intro-icon">↻</div><div><h2>Votre carnet de relance</h2><p>YÉRÉ repère les clients à recontacter à partir des commandes datées et propose un message que vous pouvez relire et copier. Rien n'est envoyé automatiquement.</p></div></div>
            <div className="reminder-summary"><div><strong>{reminderSuggestions.length}</strong><span>suggestions à examiner</span></div><div><strong>{new Set(reminderSuggestions.map((item) => item.clientId)).size}</strong><span>clients concernés</span></div><p>Les dates et règles sont indicatives. Vérifiez le contexte avant chaque prise de contact.</p></div>
            {reminderSuggestions.length === 0 ? <div className="content-card empty-reminders"><h2>Pas de relance suggérée pour le moment</h2><p>Quand des commandes datées seront enregistrées, YÉRÉ pourra repérer les clients sans commande récente ou les anciennes commandes liées à une occasion.</p></div> : <div className="reminder-list">{reminderSuggestions.map((item, index) => <article className="content-card reminder-card" key={item.clientId + "-" + item.kind + "-" + index}><div className="reminder-card-top"><span className={item.kind === "inactive" ? "reminder-kind inactive" : "reminder-kind occasion"}>{item.kind === "inactive" ? "À réactiver" : "Occasion à anticiper"}</span><span className="reminder-age">{item.daysSinceOrder} jours</span></div><h2>{item.title}</h2><p className="reminder-client-name">{item.clientName}</p><p className="reminder-detail">{item.detail}</p><div className="reminder-contact">{item.phone ? <span>☎ {item.phone}</span> : <span className="missing-phone">Téléphone non renseigné</span>}<span>Dernière commande : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.lastOrderAt + "T12:00:00"))}</span></div><div className="message-preview"><span>MESSAGE PROPOSÉ</span><p>{item.suggestedMessage}</p></div><button className="primary-button reminder-copy" disabled={!item.phone} onClick={() => { if (!navigator.clipboard?.writeText) { setNotice("La copie automatique n'est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte du message."); return; } void navigator.clipboard.writeText(item.suggestedMessage).then(() => setNotice("Message copié. Relisez-le et personnalisez-le avant de l'envoyer vous-même.")).catch(() => setNotice("Impossible de copier le message automatiquement. Sélectionnez le texte pour le copier manuellement.")); }}>Copier le message</button></article>)}</div>}
            <p className="privacy-note">Les suggestions sont calculées dans ce navigateur à partir des commandes enregistrées sur cet appareil. Aucun SMS, WhatsApp ou rappel programmé n’est envoyé.</p>
          </section>}
          <footer className="footer"><span>YÉRÉ Atelier <span>·</span> La couture, mieux organisée.</span></footer>
        </div>
      </main>
      <nav className="mobile-bottom-nav" aria-label="Navigation mobile">{mobileNavItems.map((item) => <button key={item.id} className={view === item.id ? "mobile-nav-item active" : "mobile-nav-item"} onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined}><span><AppIcon name={item.icon} size={22} /></span><small>{item.label}</small></button>)}</nav>
    </div>
  );
}

function Onboarding({ atelier, onAtelierChange, onFinish }: {
  atelier: AtelierProfile;
  onAtelierChange: (value: AtelierProfile) => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AtelierProfile>(atelier);
  const steps = [
    { eyebrow: "BIENVENUE", title: "YÉRÉ Atelier", subtitle: "La couture, mieux organisée.", body: "Retrouvez vos clients, leurs mensurations, vos commandes et vos paiements en un seul endroit.", detail: "Un outil de travail pensé pour le quotidien de votre atelier." },
    { eyebrow: "GAGNEZ DU TEMPS", title: "Fini les cahiers perdus et les recherches interminables.", subtitle: "Tout retrouver en quelques secondes.", body: "Mensurations, anciennes commandes, acomptes et dates de livraison : les informations utiles sont réunies.", detail: "Moins de recherches, moins d'oublis et moins d'erreurs de saisie." },
    { eyebrow: "SUIVI DE PRODUCTION", title: "Gardez chaque commande sous contrôle.", subtitle: "De la coupe à la livraison.", body: "Suivez les étapes de confection : coupe, couture, essayage et livraison.", detail: "Gardez une vue claire sur l’avancement et les dates de livraison." },
    { eyebrow: "GESTION DE L'ARGENT", title: "Comprenez ce que votre atelier gagne réellement.", subtitle: "Des chiffres plus clairs.", body: "Préparez le suivi des acomptes, paiements, dépenses et recettes.", detail: "Le suivi complet des dépenses et recettes sera disponible après activation des services de gestion financière." },
    { eyebrow: "INSPIRATIONS COUTURE", title: "Retrouvez les modèles au bon moment.", subtitle: "Un outil de travail, pas un réseau social.", body: "À terme, classez les photos envoyées par les clients, les modèles enregistrés et les créations réalisées.", detail: "Le catalogue d'inspirations est prévu dans la feuille de route ; il n'est pas encore disponible." },
    { eyebrow: "VOTRE ATELIER", title: "Créons votre premier atelier.", subtitle: "Quelques informations pour commencer.", body: "Renseignez le nom de votre atelier, un téléphone et une ville. Vous pourrez ensuite créer votre premier client.", detail: "Le compte en ligne et la synchronisation nécessitent l’activation du service sécurisé YÉRÉ." }
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
          <button className="primary-button onboarding-primary" type="submit">Créer mon espace atelier <span>→</span></button>
        </form>}
        {!isSetup && <p className="onboarding-detail">{current.detail}</p>}
        <div className="onboarding-actions">
          {step > 0 && <button className="secondary-button" onClick={() => setStep((value) => value - 1)}>Précédent</button>}
          {!isSetup && <button className="primary-button onboarding-primary" onClick={() => setStep((value) => Math.min(value + 1, steps.length - 1))}>{step === 0 ? "Commencer" : "Continuer"} <span>→</span></button>}
        </div>
         <p className="onboarding-disclaimer">Espace local sur cet appareil · la création d’un compte sécurisé en ligne nécessite encore l’activation du serveur.</p>
      </section>
      <aside className="onboarding-visual" aria-label="Illustration conceptuelle d'un atelier de couture organisé">
        <div className="visual-glow"></div><div className="visual-card visual-phone"><span className="visual-phone-top"></span><b>YÉRÉ Atelier</b><small>Vos commandes</small><div className="visual-task"><i></i><span>Tenue de cérémonie<small>En confection</small></span></div><div className="visual-task"><i></i><span>Boubou brodé<small>Essayage</small></span></div><div className="visual-task"><i></i><span>Robe sur mesure<small>À livrer</small></span></div></div>
        <div className="visual-card visual-notebook"><span>FICHE CLIENT</span><b>Mensurations</b><div className="visual-lines"></div><div className="visual-lines short"></div><div className="visual-lines"></div><small>Retrouvées en quelques secondes</small></div>
        <div className="visual-fabric fabric-one"></div><div className="visual-fabric fabric-two"></div><div className="visual-scissors">✂</div><p>Un atelier mieux organisé,<br/>sans perdre le fil.</p>
      </aside>
    </div>
  </main>;
}

function OrderTable({ orders, clients, onStatusChange, onView }: { orders: Order[]; clients: Client[]; onStatusChange: (id: string, status: OrderStatus) => void; onView?: (order: Order) => void }) {
  const getStatusClass = (status: OrderStatus) => status === "Prêt" ? "ready" : status === "En confection" ? "progress" : status === "Livré" ? "delivered" : "todo";
  const formatDueDate = (date: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(date + "T12:00:00"));
  const statusControl = (order: Order) => <select className={"status-select status-" + getStatusClass(order.status)} value={order.status} aria-label={"Statut de " + order.id} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>;

  return <div className="orders-display">
    <div className="table-wrap orders-desktop"><table><thead><tr><th>COMMANDE</th><th>CLIENT</th><th>DATE DE LIVRAISON</th><th>PRIX</th><th>RESTE DÛ</th><th>STATUT</th></tr></thead><tbody>{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <tr key={order.id}><td><b className="order-id">{order.id}</b><small className="table-secondary">{order.garment}</small></td><td><span className="table-client">{client?.name ?? "Client supprimé"}</span></td><td>{formatDueDate(order.dueDate)}</td><td>{formatXof(order.price)}</td><td><b className={balanceDue(order) === 0 ? "paid" : ""}>{formatXof(balanceDue(order))}</b></td><td>{statusControl(order)}</td></tr>; })}</tbody></table></div>
    <div className="order-card-list" aria-label="Commandes sous forme de cartes">{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <article className="order-card" key={order.id}><div className="order-card-heading"><div><b className="order-id">{order.id}</b><strong>{order.garment}</strong></div><span className={"order-status-chip status-" + getStatusClass(order.status)}>{order.status}</span></div><p className="order-card-client"><span>Client</span><b>{client?.name ?? "Client supprimé"}</b></p><div className="order-card-details"><div><span>Livraison</span><b>{formatDueDate(order.dueDate)}</b></div><div><span>À encaisser</span><b className={balanceDue(order) === 0 ? "paid" : "order-balance"}>{formatXof(balanceDue(order))}</b></div></div>{onView && <button type="button" className="order-view-button" onClick={() => onView(order)}>Voir la commande <span aria-hidden="true">→</span></button>}</article>; })}</div>
    {orders.length === 0 && <div className="empty-state">Aucune commande pour le moment. Créez votre première commande pour commencer.</div>}
  </div>;
}

export default App;
