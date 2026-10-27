import { useEffect, useMemo, useState, type FormEvent } from "react";
import { balanceDue, formatXof, getClientReminderSuggestions, isMeasurementValid, matchesClient, orderStatuses, saveMeasurementVersion, type Client, type Measurement, type Order, type OrderStatus } from "./domain";
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

type View = "overview" | "clients" | "orders" | "reminders";

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

  const [clients, setClients] = usePersistentState<Client[]>("yere-demo-clients-v1", initialClients);
  const [orders, setOrders] = usePersistentState<Order[]>("yere-demo-orders-v1", initialOrders);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [draftMeasurement, setDraftMeasurement] = useState<Measurement>({ ...emptyMeasurement });
  const [notice, setNotice] = useState("Démonstration : données conservées localement sur cet appareil, sans synchronisation serveur.");

  const visibleClients = useMemo(() => clients.filter((client) => matchesClient(client, query)), [clients, query]);
  const outstanding = orders.reduce((sum, order) => sum + balanceDue(order), 0);
  const selected = clients.find((client) => client.id === selectedClient);
  const reminderSuggestions = useMemo(
    () => getClientReminderSuggestions(clients, orders, new Date().toISOString().slice(0, 10)),
    [clients, orders]
  );

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
    setClientName("");
    setClientPhone("");
    setShowForm(false);
    setView("clients");
    setSelectedClient(client.id);
    setNotice(`Fiche de ${name} créée dans la démonstration.`);
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
    setNotice(`Mensurations de ${selected.name} enregistrées dans l'historique local du prototype. Aucune sauvegarde serveur n'est active.`);
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: "⌂" },
    { id: "clients", label: "Clients & mesures", icon: "♙" },
    { id: "orders", label: "Commandes", icon: "▤" },
    { id: "reminders", label: "Relances clients", icon: "↻" }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setView("overview"); }}>
          <span className="brand-mark">Y</span>
          <span><strong>YÉRÉ</strong><small>ATELIER</small></span>
        </a>
        <div className="atelier-switch"><span className="atelier-avatar">A</span><span><b>Atelier Démo</b><small>Compte de démonstration</small></span><span className="chevron">⌄</span></div>
        <p className="nav-caption">ESPACE ATELIER</p>
        <nav aria-label="Navigation principale">
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "clients" && <span className="nav-count">{clients.length}</span>}{item.id === "reminders" && reminderSuggestions.length > 0 && <span className="nav-count">{reminderSuggestions.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><b>Un atelier mieux organisé.</b><p>Vos clients, leurs mesures et vos commandes au même endroit.</p></div><div className="profile"><span className="profile-avatar">AD</span><span><b>Atelier Démo</b><small>Mode aperçu</small></span><span className="dots">···</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">YÉRÉ <span>/</span> Atelier <span>/</span> <b>{navItems.find((item) => item.id === view)?.label}</b></div><div className="topbar-right"><span className="demo-pill"><i /> Démonstration</span><span className="demo-pill" role="status" aria-live="polite"><i /> {isOnline ? "En ligne" : "Hors ligne"}</span><button className="avatar-button" aria-label="Profil de démonstration">AD</button></div></header>
        <div className="page-wrap">
          <div className="welcome-row"><div><p className="eyebrow">MARDI 27 OCTOBRE 2026</p><h1>{view === "overview" ? "Votre atelier, en un coup d’œil." : view === "clients" ? "Vos clients & mensurations" : view === "orders" ? "Suivi des commandes" : "Faites revenir vos clients."}</h1><p className="page-subtitle">{view === "overview" ? "Gardez le fil de vos commandes et de votre activité." : view === "clients" ? "Retrouvez les fiches clients et leurs dernières mesures." : view === "orders" ? "Suivez chaque pièce, de la préparation à la livraison." : "Des occasions concrètes de reprendre contact, sans envoyer de message automatiquement."}</p></div><button className="primary-button" onClick={() => { setShowForm(true); setView("clients"); }}><span>＋</span> Nouveau client</button></div>
          {notice && <div className="notice"><span>ⓘ</span><p>{notice}</p><button aria-label="Fermer le message" onClick={() => setNotice("")}>×</button></div>}

          {view === "overview" && <>
            <section className="stats-grid" aria-label="Indicateurs de l'atelier">
              <article className="stat-card"><div className="stat-top"><span>Commandes en cours</span><span className="stat-icon green">▤</span></div><strong>{orders.filter((order) => order.status !== "Livré").length.toString().padStart(2, "0")}</strong><small><span className="stat-dot green-dot" /> À suivre cette semaine</small></article>
              <article className="stat-card"><div className="stat-top"><span>Clients enregistrés</span><span className="stat-icon purple">♙</span></div><strong>{clients.length.toString().padStart(2, "0")}</strong><small>Vos fiches et mensurations</small></article>
              <article className="stat-card"><div className="stat-top"><span>Reste à encaisser</span><span className="stat-icon amber">₣</span></div><strong className="money-stat">{formatXof(outstanding)}</strong><small>Acomptes déduits</small></article>
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

          {view === "orders" && <section className="content-card"><div className="section-heading"><div><h2>Commandes de l’atelier</h2><p>Modifiez le statut pour tester le suivi de production.</p></div><span className="demo-pill">Données de démonstration</span></div><OrderTable orders={orders} clients={clients} onStatusChange={updateStatus} /></section>}

          {view === "reminders" && <section className="reminders-page">
            <div className="reminders-intro content-card"><div className="reminders-intro-icon">↻</div><div><h2>Votre carnet de relance</h2><p>YÉRÉ repère les clients à recontacter à partir des commandes datées et propose un message que vous pouvez relire et copier. Rien n'est envoyé automatiquement.</p></div></div>
            <div className="reminder-summary"><div><strong>{reminderSuggestions.length}</strong><span>suggestions à examiner</span></div><div><strong>{new Set(reminderSuggestions.map((item) => item.clientId)).size}</strong><span>clients concernés</span></div><p>Les dates et règles sont indicatives. Vérifiez le contexte avant chaque prise de contact.</p></div>
            {reminderSuggestions.length === 0 ? <div className="content-card empty-reminders"><h2>Pas de relance suggérée pour le moment</h2><p>Quand des commandes datées seront enregistrées, YÉRÉ pourra repérer les clients sans commande récente ou les anciennes commandes liées à une occasion.</p></div> : <div className="reminder-list">{reminderSuggestions.map((item, index) => <article className="content-card reminder-card" key={item.clientId + "-" + item.kind + "-" + index}><div className="reminder-card-top"><span className={item.kind === "inactive" ? "reminder-kind inactive" : "reminder-kind occasion"}>{item.kind === "inactive" ? "À réactiver" : "Occasion à anticiper"}</span><span className="reminder-age">{item.daysSinceOrder} jours</span></div><h2>{item.title}</h2><p className="reminder-client-name">{item.clientName}</p><p className="reminder-detail">{item.detail}</p><div className="reminder-contact">{item.phone ? <span>☎ {item.phone}</span> : <span className="missing-phone">Téléphone non renseigné</span>}<span>Dernière commande : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.lastOrderAt + "T12:00:00"))}</span></div><div className="message-preview"><span>MESSAGE PROPOSÉ</span><p>{item.suggestedMessage}</p></div><button className="primary-button reminder-copy" disabled={!item.phone} onClick={() => { if (!navigator.clipboard?.writeText) { setNotice("La copie automatique n'est pas disponible dans ce navigateur. Vous pouvez sélectionner le texte du message."); return; } void navigator.clipboard.writeText(item.suggestedMessage).then(() => setNotice("Message copié. Relisez-le et personnalisez-le avant de l'envoyer vous-même.")).catch(() => setNotice("Impossible de copier le message automatiquement. Sélectionnez le texte pour le copier manuellement.")); }}>Copier le message</button></article>)}</div>}
            <p className="privacy-note">Prototype uniquement : les suggestions sont calculées dans ce navigateur à partir des données de démonstration. Aucun SMS, WhatsApp ou rappel programmé n'est envoyé.</p>
          </section>}
          <footer className="footer"><span>YÉRÉ Atelier <span>·</span> La couture, mieux organisée.</span><span>Prototype de démonstration · stockage local uniquement</span></footer>
        </div>
      </main>
    </div>
  );
}

function OrderTable({ orders, clients, onStatusChange }: { orders: Order[]; clients: Client[]; onStatusChange: (id: string, status: OrderStatus) => void }) {
  return <div className="table-wrap"><table><thead><tr><th>COMMANDE</th><th>CLIENT</th><th>DATE DE LIVRAISON</th><th>PRIX</th><th>RESTE DÛ</th><th>STATUT</th></tr></thead><tbody>{orders.map((order) => { const client = clients.find((item) => item.id === order.clientId); return <tr key={order.id}><td><b className="order-id">{order.id}</b><small className="table-secondary">{order.garment}</small></td><td><span className="table-client">{client?.name ?? "Client supprimé"}</span></td><td>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(order.dueDate + "T12:00:00"))}</td><td>{formatXof(order.price)}</td><td><b className={balanceDue(order) === 0 ? "paid" : ""}>{formatXof(balanceDue(order))}</b></td><td><select className={`status-select status-${order.status === "Prêt" ? "ready" : order.status === "En confection" ? "progress" : order.status === "Livré" ? "delivered" : "todo"}`} value={order.status} aria-label={`Statut de ${order.id}`} onChange={(event) => onStatusChange(order.id, event.target.value as OrderStatus)}>{orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>; })}</tbody></table>{orders.length === 0 && <div className="empty-state">Aucune commande pour le moment.</div>}</div>;
}

export default App;
