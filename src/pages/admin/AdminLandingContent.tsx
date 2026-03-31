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
import { Save, Plus, Trash2, Star, GripVertical } from "lucide-react";

const AdminLandingContent = () => {
  const qc = useQueryClient();

  // ── Site Settings ──
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").order("key");
      if (error) throw error;
      return data as any[];
    },
  });

  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); toast.success("Témoignage sauvegardé"); },
  });

  const deleteTestimonial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-testimonials"] }); toast.success("Supprimé"); },
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-faq"] }); toast.success("FAQ sauvegardée"); },
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-faq"] }); toast.success("Supprimé"); },
  });

  const addFaq = () => {
    upsertFaq.mutate({
      question: "Nouvelle question ?",
      answer: "Réponse ici...",
      sort_order: (faqItems?.length || 0) + 1,
    });
  };

  // Group settings by section
  const settingGroups: Record<string, string[]> = {
    "Hero": ["hero_headline", "hero_headline_gradient", "hero_subtitle", "hero_cta_primary", "hero_cta_secondary", "hero_badge", "hero_stat_1", "hero_stat_2", "hero_stat_3"],
    "Social Proof": ["social_proof_title"],
    "Comment ça marche": ["how_step_1_title", "how_step_1_desc", "how_step_2_title", "how_step_2_desc", "how_step_3_title", "how_step_3_desc"],
    "Footer": ["footer_tagline", "footer_legal_url", "footer_privacy_url", "footer_contact_url", "social_instagram", "social_linkedin"],
  };

  return (
    <AdminLayout title="Contenu Landing Page" subtitle="Gérez tous les textes, témoignages et FAQ de la page d'accueil">
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Textes & Paramètres</TabsTrigger>
          <TabsTrigger value="testimonials">Témoignages</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
        </TabsList>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-6">
          {Object.entries(settingGroups).map(([group, keys]) => (
            <div key={group} className="rounded-2xl bg-card border border-border/40 p-6 shadow-sm space-y-4">
              <h3 className="font-display font-semibold text-sm">{group}</h3>
              <div className="space-y-3">
                {keys.map((key) => {
                  const setting = settings?.find((s: any) => s.key === key);
                  const currentValue = editedSettings[key] ?? setting?.value ?? "";
                  const isLong = currentValue.length > 80 || key.includes("subtitle") || key.includes("desc");
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-xs text-muted-foreground font-mono">{key}</label>
                      {isLong ? (
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
          <Button onClick={saveAllSettings} disabled={!Object.keys(editedSettings).length} className="bg-gradient-primary text-primary-foreground">
            <Save className="w-4 h-4 mr-2" /> Sauvegarder les modifications
          </Button>
        </TabsContent>

        {/* ── Testimonials Tab ── */}
        <TabsContent value="testimonials" className="space-y-4">
          <Button onClick={addTestimonial} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter un témoignage
          </Button>
          {testimonials?.map((t: any) => (
            <div key={t.id} className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Note:</span>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={t.rating}
                    className="w-16"
                    onBlur={(e) => upsertTestimonial.mutate({ ...t, rating: parseInt(e.target.value) || 5 })}
                  />
                  <span className="text-xs text-muted-foreground">Ordre:</span>
                  <Input
                    type="number"
                    defaultValue={t.sort_order}
                    className="w-16"
                    onBlur={(e) => upsertTestimonial.mutate({ ...t, sort_order: parseInt(e.target.value) || 0 })}
                  />
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
                  <Switch
                    checked={t.is_visible}
                    onCheckedChange={(v) => upsertTestimonial.mutate({ ...t, is_visible: v })}
                  />
                  <span className="text-xs text-muted-foreground">Visible</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteTestimonial.mutate(t.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── FAQ Tab ── */}
        <TabsContent value="faq" className="space-y-4">
          <Button onClick={addFaq} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" /> Ajouter une question
          </Button>
          {faqItems?.map((f: any) => (
            <div key={f.id} className="rounded-xl bg-card border border-border/40 p-5 space-y-3">
              <div className="flex gap-3 items-start">
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
                    rows={2}
                  />
                </div>
                <Input
                  type="number"
                  defaultValue={f.sort_order}
                  className="w-16"
                  onBlur={(e) => upsertFaq.mutate({ ...f, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={f.is_visible}
                    onCheckedChange={(v) => upsertFaq.mutate({ ...f, is_visible: v })}
                  />
                  <span className="text-xs text-muted-foreground">Visible</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteFaq.mutate(f.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminLandingContent;
