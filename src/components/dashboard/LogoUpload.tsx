import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LogoUploadProps {
  currentUrl: string | null;
  businessId: string;
  onUploaded: (url: string) => void;
}

export function LogoUpload({ currentUrl, businessId, onUploaded }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier doit faire moins de 2 Mo");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${businessId}/logo.${ext}`;

    const { error } = await supabase.storage
      .from("business-logos")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("business-logos")
      .getPublicUrl(path);

    // Add cache-buster
    const url = `${publicUrl}?t=${Date.now()}`;
    setPreview(url);
    onUploaded(url);

    // Save to business
    await supabase.from("businesses").update({ logo_url: url }).eq("id", businessId);

    toast.success("Logo mis à jour !");
    setUploading(false);
  };

  const handleRemove = async () => {
    setPreview(null);
    onUploaded("");
    await supabase.from("businesses").update({ logo_url: null }).eq("id", businessId);
    toast.success("Logo supprimé");
  };

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Logo"
            className="w-20 h-20 rounded-2xl object-cover border border-border/50"
          />
          <button
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      )}
      <div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Upload..." : preview ? "Changer" : "Uploader un logo"}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG — max 2 Mo</p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
