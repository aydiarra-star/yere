import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const taskSql = readFileSync(
  "supabase/migrations/20261101100000_add_order_task_assignments_and_history.sql",
  "utf8"
);
const profileSql = readFileSync(
  "supabase/migrations/20261101120000_add_owner_managed_tailor_professional_profiles.sql",
  "utf8"
);
const rosterSql = readFileSync(
  "supabase/migrations/20261101090000_allow_team_members_to_view_workgroup.sql",
  "utf8"
);

describe("contrat SQL des tâches YÉRÉ (contrôles statiques)", () => {
  it("protège les tables de tâches par RLS et limite la lecture aux membres de l’atelier", () => {
    expect(taskSql).toMatch(/alter table public\.commande_tache enable row level security/i);
    expect(taskSql).toMatch(/alter table public\.commande_tache_historique enable row level security/i);
    expect(taskSql).toMatch(/private\.is_atelier_member\(atelier_id\)/i);
    expect(taskSql).toMatch(/grant select on table public\.commande_tache_historique to authenticated/i);
    expect(taskSql).not.toMatch(/grant\s+(?:all|insert|update|delete)[^;]*commande_tache_historique/i);
  });

  it("réserve création et réattribution aux propriétaires et gestionnaires", () => {
    expect(taskSql).toMatch(/commande_tache_insert_managers[\s\S]*?private\.has_atelier_role\(atelier_id, array\['proprietaire', 'gestionnaire'\]/i);
    expect(taskSql).toMatch(/v_is_manager := private\.has_atelier_role\([\s\S]*?array\['proprietaire', 'gestionnaire'\]/i);
    expect(taskSql).toMatch(/m\.actif = true and m\.role = 'employe'/i);
  });

  it("limite un tailleur à ses propres tâches et empêche de modifier leur attribution", () => {
    expect(taskSql).toMatch(/old\.assigne_a is distinct from auth\.uid\(\)/i);
    expect(taskSql).toMatch(/new\.assigne_a is distinct from old\.assigne_a/i);
    expect(taskSql).toMatch(/new\.note_avancement is distinct from old\.note_avancement/i);
    expect(taskSql).toMatch(/new\.statut is distinct from old\.statut/i);
  });

  it("historise automatiquement création, attribution, statut et notes", () => {
    for (const event of ["creation", "attribution", "changement_statut", "note_avancement"]) {
      expect(taskSql).toContain(`'${event}'`);
    }
    expect(taskSql).toMatch(/after insert on public\.commande_tache/i);
    expect(taskSql).toMatch(/after update on public\.commande_tache/i);
    expect(taskSql).toMatch(/acteur_id, evenement/i);
  });

  it("empêche de clôturer une commande avec des tâches ouvertes et conserve le flux sans tâche", () => {
    expect(taskSql).toMatch(/new\.statut in \('pret', 'livre'\)[\s\S]*?t\.statut <> 'terminee'/i);
    expect(taskSql).toMatch(/where t\.atelier_id = v_atelier_id[\s\S]*?and t\.commande_id = v_commande_id/i);
    expect(taskSql).toMatch(/if v_all_done is true then/i);
    expect(taskSql).toMatch(/else[\s\S]*?set statut = 'en_confection'/i);
    expect(taskSql).toMatch(/orders without detailed tasks retain the existing manual workflow/i);
  });

  it("n’introduit aucun champ de rémunération, profit ou paiement individuel", () => {
    expect(taskSql).not.toMatch(/^\\s*(?:remuneration|rémunération|profit_individuel|paiement_individuel)\\s+\\w+/im);
  });
});

describe("contrat SQL des profils professionnels", () => {
  it("réserve l’édition au propriétaire et cible uniquement un tailleur actif du même atelier", () => {
    expect(profileSql).toMatch(/private\.has_atelier_role\(p_atelier_id, array\['proprietaire'\]/i);
    expect(profileSql).toMatch(/where m\.atelier_id = p_atelier_id\s+and m\.user_id = p_user_id/i);
    expect(profileSql).toMatch(/v_target_role <> 'employe' or not v_target_active/i);
  });

  it("valide les champs et borne le nombre de spécialités", () => {
    expect(profileSql).toMatch(/length\(trim\(coalesce\(p_nom_professionnel, ''\)\)\) > 100/i);
    expect(profileSql).toMatch(/length\(trim\(coalesce\(p_presentation, ''\)\)\) > 600/i);
    expect(profileSql).toMatch(/cardinality\(p_specialites\), 0\) > 8/i);
    expect(profileSql).toMatch(/array_agg\(distinct left\(trim\(value\), 60\)\)/i);
  });

  it("garde la fonction privilégiée dans private et expose uniquement un RPC SECURITY INVOKER", () => {
    expect(profileSql).toMatch(/create or replace function private\.update_atelier_member_profile_impl/i);
    expect(profileSql).toMatch(/security definer/i);
    expect(profileSql).toMatch(/if auth\.uid\(\) is null then/i);
    expect(profileSql).toMatch(/create or replace function public\.update_atelier_member_profile/i);
    expect(profileSql).toMatch(/language sql\s+security invoker/i);
    expect(profileSql).toMatch(/revoke all on function public\.update_atelier_member_profile[\s\S]*?from public, anon/i);
    expect(profileSql).not.toMatch(/^\\s*(?:remuneration|rémunération|profit_individuel|paiement_individuel)\\s+\\w+/im);
  });

  it("permet la consultation du profil à tous les membres actifs sans élargir les droits d’écriture", () => {
    expect(rosterSql).toMatch(/for select\s+to authenticated\s+using \(private\.is_atelier_member\(atelier_id\)\)/i);
    expect(rosterSql).not.toMatch(/for update|for insert|for delete/i);
  });
});
