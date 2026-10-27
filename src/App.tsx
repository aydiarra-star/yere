import { useEffect, useMemo, useState, type FormEvent } from "react";
import { balanceDue, formatXof, matchesClient, orderStatuses, type Client, type Measurement, type Order, type OrderStatus } from "./domain";
import { usePersistentState } from "./usePersistentState";

const emptyMeasurement: Measurement = { bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "", note: "" };

const initialClients: Client[] = [
  { id: "c-1", name: "Aïssatou Ndiaye", phone: "+221 77 123 45 67", createdAt: "2026-10-22", measurement: { bust: "92", waist: "74", hips: "100", shoulder: "38", sleeve: "58", length: "145", note: "Préférence : coupe ample" } },
  { id: "c-2", name: "Mamadou Ba", phone: "+221 76 234 56 78", createdAt: "2026-10-23", measurement: { bust: "98", waist: "86", hips: "102", shoulder: "44", sleeve: "62", length: "150", note: "Boubou traditionnel" } },
  { id: "c-3", name: "Fatou Sarr", phone: "+221 70 345 67 89", createdAt: "2026-10-25", measurement: { bust: "88", waist: "70", hips: "96", shoulder: "36", sleeve: "56", length: "138", note: "" } }
];

const initialOrders: Order[] = [
  { id: "YR-1024", clientId: "c-1", garment: "Ensemble deux pièces", dueDate: "2026-10-29", price: 35000, deposit: 20000, status: "En confection" },
  { id: "YR-1025", clientId: "c-2", garment: "Boubou brodé", dueDate: "2026-10-30", price: 45000, deposit: 15000, status: "À préparer" },
  { id: "YR-1026", clientId: "c-3", garment: "Robe sur mesure", dueDate: "2026-10-27", price: 25000, deposit: 25000, status: "Prêt" }
];

type View = "overview" | "clients" | "orders";

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
  const [notice, setNotice] = useState("Démonstration : données conservées localement sur cet appareil, sans synchronisation serveur.");

  const visibleClients = useMemo(() => clients.filter((client) => matchesClient(client, query)), [clients, query]);
  const outstanding = orders.reduce((sum, order) => sum + balanceDue(order), 0);
  const selected = clients.find((client) => client.id === selectedClient);

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

  function updateMeasurement(clientId: string, field: keyof Measurement, value: string) {
    setClients((current) => current.map((client) => client.id === clientId
      ? { ...client, measurement: { ...client.measurement, [field]: value } }
      : client));
    setNotice("Mensurations mises à jour sur cet appareil. Aucune synchronisation serveur n'est encore active.");
  }

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: "overview", label: "Vue d'ensemble", icon: "⌂" },
    { id: "clients", label: "Clients & mesures", icon: "♙" },
    { id: "orders", label: "Commandes", icon: "▤" }
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
          {navItems.map((item) => <button key={item.id} className={view === item.id ? "nav-item active" : "nav-item"} onClick={() => setView(item.id)}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === "clients" && <span className="nav-count">{clients.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><span className="help-icon">✳</span><b>Un atelier mieux organisé.</b><p>Vos clients, leurs mesures et vos commandes au même endroit.</p></div><div className="profile"><span className="profile-avatar">AD</span><span><b>Atelier Démo</b><small>Mode aperçu</small></span><span className="dots">···</span></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="breadcrumb">YÉRÉ <span>/</span> Atelier <span>/</span> <b>{navItems.find((item) => item.id === view)?.label}</b></div><div className="topbar-right"><span className="demo-pill"><i /> Démonstration</span><span className="demo-pill" role="status" aria-live="polite"><i /> {isOnline ? "En ligne" : "Hors ligne"}</span><button className="avatar-button" aria-label="Profil de démonstration">AD</button></div></header>
        <div className="page-wrap">
          <div className="welcome-row"><div><p className="eyebrow">MARDI 27 OCTOBRE 2026</p><h1>{view === "overview" ? "Votre atelier, en un coup d’œil." : view === "clients" ? "Vos clients & mensurations" : "Suivi des commandes"}</h1><p className="page-subtitle">{view === "overview" ? "Gardez le fil de vos commandes et de votre activité." : view === "clients" ? "Retrouvez les fiches clients et leurs dernières mesures." : "Suivez chaque pièce, de la préparation à la livraison."}</p></div><button className="primary-button" onClick={() => { setShowForm(true); setView("clients"); }}><span>＋</span> Nouveau client</button></div>
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
            {selected && <div className="measurement-panel"><div className="section-heading"><div><h2>Mensurations de {selected.name}</h2><p>Dernière fiche de mesures enregistrée en démonstration</p></div><span className="demo-pill">Exemple</span></div><div className="measurement-grid">{[["Tour de poitrine","bust"],["Tour de taille","waist"],["Tour de hanches","hips"],["Épaules","shoulder"],["Longueur de manche","sleeve"],["Longueur du vêtement","length"]].map(([label, key]) => <label className="measure-field" key={key}><span>{label} (cm)</span><input inputMode="decimal" aria-label={label} value={selected.measurement[key as keyof Measurement] as string} onChange={(event) => updateMeasurement(selected.id, key as keyof Measurement, event.target.value)} placeholder="—" /></label>)}</div><label className="measure-notes-field">Notes pour la prochaine commande<textarea value={selected.measurement.note} onChange={(event) => updateMeasurement(selected.id, "note", event.target.value)} placeholder="Préférences, coupe, tissu…" rows={2} /></label><p className="privacy-note">Prototype uniquement : ces informations sont conservées dans le stockage local de ce navigateur, sans compte ni sauvegarde serveur. N'utilise pas de données clients réelles.</p></div>}
          </section>}

          {view === "orders" && <section className="content-card"><div className="section-heading"><div><h2>Commandes de l’atelier</h2><p>Modifiez le statut pour tester le suivi de production.</p></div><span className="demo-pill">Données de démonstration</span></div><OrderTable orders={orders} clients={clients} onStatusChange={updateStatus} /></section>}
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
