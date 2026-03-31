import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Plus, Trash2, Star, ArrowUp, ArrowDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SETTING_SECTIONS = [
  {
    title: "🎯 Hero",
    keys: [
      { key: "hero_headline", label: "Titre principal" },
      { key: "hero_headline_gradient", label: "Mot avec dégradé" },
      { key: "hero_subtitle", label: "Sous-titre", long: true },
      { key: "hero_badge", label: "Badge texte" },
      { key: "hero_cta_primary", label: "Bouton CTA principal" },
      { key: "hero_cta_secondary", label: "Bouton CTA secondaire" },
      { key: "hero_stat_1", label: "Stat 1" },
      { key: "hero_stat_2", label: "Stat 2" },
      { key: "hero_stat_3", label: "Stat 3" },
    ],
  },
  {
    title: "🔄 Comment ça marche",
    keys: [
      { key: "how_step_1_title", label: "Étape 1 — Titre" },
      { key: "how_step_1_desc", label: "Étape 1 — Description", long: true },
      { key: "how_step_2_title", label: "Étape 2 — Titre" },
      { key: "how_step_2_desc", label: "Étape 2 — Description", long: true },
      { key: "how_step_3_title", label: "Étape 3 — Titre" },
      { key: "how_step_3_desc", label: "Étape 3 — Description", long: true },
    ],
  },
  {
    title: "💬 Social Proof",
    keys: [
      { key: "social_proof_title", label: "Titre de section" },
    ],
  },
  {
    title: "📎 Footer",
    keys: [
      { key: "footer_tagline", label: "Tagline", long: true },
      { key: "footer_legal_url", label: "URL Mentions légales" },
      { key: "footer_privacy_url", label: "URL Politique de confidentialité" },
      { key: "footer_contact_url", label: "URL Contact" },
      { key: "social_instagram", label: "URL Instagram" },
      { key: "social_linkedin", label: "URL LinkedIn" },
    ],
  },
  {
    title: "🚀 Onboarding marchand",
    keys: [
      { key: "onboarding_step_1", label: "Étape 1" },
      { key: "onboarding_step_2", label: "Étape 2" },
      { key: "onboarding_step_3", label: "Étape 3" },
      { key: "onboarding_step_4", label: "Étape 4" },
    ],
  },
];

const AdminLandingContent = () => {
  const qc = useQueryClient();

  // ── Site Settings ──
  const { data: settings } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").order("key");
      if (error) throw error;
      return data as any[];
    },
  });

  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const dirtyCount = Object.keys(editedSettings).length;

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-site-settings"] }); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
  });

  const saveAllSettings = async () => {
    const entries = Object.entries(editedSettings);
    if (!entries.length) return;
    for (const [key, value] of entries) {
      await updateSetting.mutateAsync({ key, value });
    }
    setEditedSettings({});
    toast.success(`${entries.length} paramètre(s) sauvegardé(s)`);
  };

  // ── Testimonials ──
  const { data: testimonials } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("testimonials").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertTestimonial = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("testimonials").upsert(t);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); },
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); toast.success("Témoignage supprimé"); },
  });

  const addTestimonial = () => {
    upsertTestimonial.mutate({
      business_name: "Nouveau commerce",
      category: "Général",
      quote: "Votre témoignage ici...",
      rating: 5,
      sort_order: (testimonials?.length || 0) + 1,
    });
  };

  const moveTestimonial = (index: number, direction: -1 | 1) => {
    if (!testimonials) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= testimonials.length) return;
    const a = testimonials[index];
    const b = testimonials[swapIndex];
    upsertTestimonial.mutate({ ...a, sort_order: b.sort_order });
    upsertTestimonial.mutate({ ...b, sort_order: a.sort_order });
  };

  // ── FAQ ──
  const { data: faqItems } = useQuery({
    queryKey: ["admin-faq"],
    queryFn: async () => {
      const { data, error } = await supabase.from("faq_items").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertFaq = useMutation({
    mutationFn: async (f: any) => {
      const { error } = await supabase.from("faq_items").upsert(f);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-faq"] }); },
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-faq"] }); toast.success("Question supprimée"); },
  });

  const addFaq = () => {
    upsertFaq.mutate({
      question: "Nouvelle question ?",
      answer: "Réponse ici...",
      sort_order: (faqItems?.length || 0) + 1,
    });
  };

  const moveFaq = (index: number, direction: -1 | 1) => {
    if (!faqItems) return;
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= faqItems.length) return;
    const a = faqItems[index];
    const b = faqItems[swapIndex];
    upsertFaq.mutate({ ...a, sort_order: b.sort_order });
    upsertFaq.mutate({ ...b, sort_order: a.sort_order });
  };

  // ── Reward Templates ──
  const { data: rewardTemplates } = useQuery({
    queryKey: ["admin-reward-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reward_templates").select("*").order("sort_order");
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertRewardTemplate = useMutation({
    mutationFn: async (t: any) => {
      const { error } = await supabase.from("reward_templates").upsert(t);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reward-templates"] }); },
  });

  const deleteRewardTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reward_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reward-templates"] }); toast.success("Template supprimé"); },
  });

  const addRewardTemplate = () => {
    upsertRewardTemplate.mutate({
      name: "Nouvelle récompense",
      description: "Description...",
      points_required: 10,
      emoji: "🎁",
      sort_order: (rewardTemplates?.length || 0) + 1,
    });
  };

  const renderStars = (rating: number, onChange: (v: number) => void) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={() => onChange(s)} className="focus:outline-none">
          <Star className={`w-4 h-4 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );

  return (
    <AdminLayout title="Contenu du site" subtitle="Gérez tous les textes, témoignages, FAQ et templates">
      {dirtyCount > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-2">
          <span className="text-sm font-medium">{dirtyCount} modification(s) non sauvegardée(s)</span>
          <Button size="sm" onClick={saveAllSettings} className="bg-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Sauvegarder tout
          </Button>
        </div>
      )}

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="settings">Textes & Paramètres</TabsTrigger>
          <TabsTrigger value="testimonials">Témoignages ({testimonials?.length || 0})</TabsTrigger>
          <TabsTrigger value="faq">FAQ ({faqItems?.length || 0})</TabsTrigger>
          <TabsTrigger value="rewards">Templates récompenses ({rewardTemplates?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-6">
          {SETTING_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
              <h3 className="font-display font-semibold text-sm">{section.title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {section.keys.map(({ key, label, long }) => {
                  const setting = settings?.find((s: any) => s.key === key);
                  const currentValue = editedSettings[key] ?? setting?.value ?? "";
                  return (
                    <div key={key} className={`flex flex-col gap-1.5 ${long ? "sm:col-span-2" : ""}`}>
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      {long ? (
                        <Textarea
                          value={currentValue}
                          onChange={(e) => setEditedSettings({ ...editedSettings, [key]: e.target.value })}
                          rows={3}
                          className="text-sm"
                        />
                      ) : (
                        <Input
                          value={currentValue}
                          onChange={(e) => setEditedSettings({ ...editedSettings, [key]: e.target.value })}
                          className="text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Testimonials Tab ── */}
        <TabsContent value="testimonials" className="space-y-4">
          <Button onClick={addTestimonial} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un témoignage
          </Button>
          {testimonials?.map((t: any, idx: number) => (
            <div key={t.id} className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => moveTestimonial(idx, -1)}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === (testimonials?.length || 0) - 1} onClick={() => moveTestimonial(idx, 1)}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
                <span className="text-xs font-mono text-muted-foreground">#{t.sort_order}</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  defaultValue={t.business_name}
                  placeholder="Nom commerce"
                  onBlur={(e) => upsertTestimonial.mutate({ ...t, business_name: e.target.value })}
                />
                <Input
                  defaultValue={t.category}
                  placeholder="Catégorie"
                  onBlur={(e) => upsertTestimonial.mutate({ ...t, category: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  {renderStars(t.rating, (v) => upsertTestimonial.mutate({ ...t, rating: v }))}
                </div>
              </div>
              <Textarea
                defaultValue={t.quote}
                placeholder="Citation"
                onBlur={(e) => upsertTestimonial.mutate({ ...t, quote: e.target.value })}
                rows={2}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={t.is_visible} onCheckedChange={(v) => upsertTestimonial.mutate({ ...t, is_visible: v })} />
                  <span className="text-xs text-muted-foreground">{t.is_visible ? "Visible" : "Masqué"}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce témoignage ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteTestimonial.mutate(t.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── FAQ Tab ── */}
        <TabsContent value="faq" className="space-y-4">
          <Button onClick={addFaq} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter une question
          </Button>
          {faqItems?.map((f: any, idx: number) => (
            <div key={f.id} className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === 0} onClick={() => moveFaq(idx, -1)}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-5 w-5" disabled={idx === (faqItems?.length || 0) - 1} onClick={() => moveFaq(idx, 1)}>
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    defaultValue={f.question}
                    placeholder="Question"
                    onBlur={(e) => upsertFaq.mutate({ ...f, question: e.target.value })}
                    className="font-semibold"
                  />
                  <Textarea
                    defaultValue={f.answer}
                    placeholder="Réponse"
                    onBlur={(e) => upsertFaq.mutate({ ...f, answer: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={f.is_visible} onCheckedChange={(v) => upsertFaq.mutate({ ...f, is_visible: v })} />
                  <span className="text-xs text-muted-foreground">{f.is_visible ? "Visible" : "Masqué"}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteFaq.mutate(f.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── Reward Templates Tab ── */}
        <TabsContent value="rewards" className="space-y-4">
          <Button onClick={addRewardTemplate} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un template
          </Button>
          {rewardTemplates?.map((t: any) => (
            <div key={t.id} className="rounded-xl bg-card border border-border/40 p-5">
              <div className="grid sm:grid-cols-4 gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Emoji</label>
                  <Input
                    defaultValue={t.emoji}
                    className="w-20 text-center text-lg"
                    onBlur={(e) => upsertRewardTemplate.mutate({ ...t, emoji: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Nom</label>
                  <Input
                    defaultValue={t.name}
                    onBlur={(e) => upsertRewardTemplate.mutate({ ...t, name: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">Points requis</label>
                  <Input
                    type="number"
                    defaultValue={t.points_required}
                    onBlur={(e) => upsertRewardTemplate.mutate({ ...t, points_required: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea
                  defaultValue={t.description || ""}
                  placeholder="Description optionnelle"
                  onBlur={(e) => upsertRewardTemplate.mutate({ ...t, description: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Switch checked={t.is_visible} onCheckedChange={(v) => upsertRewardTemplate.mutate({ ...t, is_visible: v })} />
                  <span className="text-xs text-muted-foreground">{t.is_visible ? "Actif" : "Inactif"}</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteRewardTemplate.mutate(t.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminLandingContent;
