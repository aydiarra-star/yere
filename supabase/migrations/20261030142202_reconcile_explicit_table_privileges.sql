-- Remove legacy broad grants left by the previous public-schema defaults,
-- then regrant only the operations actually protected by RLS policies.
revoke all on table public.atelier, public.atelier_membre, public.client, public.mensuration,
 public.commande, public.paiement, public.depense, public.stock_article, public.stock_mouvement,
 public.fournisseur, public.achat_fournisseur, public.ligne_achat_fournisseur,
 public.paiement_fournisseur, public.profil_fournisseur, public.invitation_atelier
from anon, authenticated;
grant select, update on public.atelier to authenticated;
grant select on public.atelier_membre to authenticated;
grant select, insert, update, delete on public.client to authenticated;
grant select, insert, update, delete on public.mensuration to authenticated;
grant select, insert, update, delete on public.commande to authenticated;
grant select, insert on public.paiement to authenticated;
grant select, insert, update on public.depense to authenticated;
grant select, insert, update on public.stock_article to authenticated;
grant select, insert on public.stock_mouvement to authenticated;
grant select, insert, update on public.fournisseur to authenticated;
grant select, insert, update on public.achat_fournisseur to authenticated;
grant select, insert on public.ligne_achat_fournisseur to authenticated;
grant select, insert on public.paiement_fournisseur to authenticated;
grant select, insert, update on public.profil_fournisseur to authenticated;
grant select, insert on public.invitation_atelier to authenticated;