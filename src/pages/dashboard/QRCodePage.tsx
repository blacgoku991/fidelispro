import { useAuth } from "@/hooks/useAuth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { MobileHeader } from "@/components/dashboard/MobileHeader";
import { businessSidebarItems } from "@/lib/sidebarItems";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Download, Copy, ExternalLink, Printer } from "lucide-react";
import { toast } from "sonner";

const QRCodePage = () => {
  const { loading, business, logout } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  const publicUrl = `${window.location.origin}/b/${business?.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Lien copié !");
  };

  const downloadQR = () => {
    const svg = document.getElementById("business-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 1024, 1024);
      const a = document.createElement("a");
      a.download = `qr-${business?.name || "fidelipro"}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const svg = document.getElementById("business-qr-svg");
    if (!svg) return;
    printWindow.document.write(`
      <html><head><title>QR Code - ${business?.name}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0}
      h1{font-size:2rem;margin-bottom:0.5rem}p{color:#666;margin-bottom:2rem}
      </style></head><body>
      <h1>${business?.name}</h1>
      <p>Scannez pour obtenir votre carte de fidélité</p>
      ${svg.outerHTML}
      <p style="margin-top:2rem;font-size:0.8rem">Propulsé par FidéliPro</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar items={businessSidebarItems} onLogout={logout} />
      <main className="lg:ml-64 p-6 lg:p-8">
        <MobileHeader onLogout={logout} items={businessSidebarItems} />

        <h1 className="text-2xl font-display font-bold mb-2">QR Code Vitrine</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Affichez ce QR code dans votre commerce pour que les clients s'inscrivent instantanément
        </p>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-card border border-border/50 flex flex-col items-center">
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG
                id="business-qr-svg"
                value={publicUrl}
                size={280}
                level="H"
                includeMargin
                fgColor={business?.primary_color || "#6B46C1"}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Scannez pour obtenir votre carte de fidélité chez <strong>{business?.name}</strong>
            </p>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button onClick={downloadQR} variant="outline" className="rounded-xl gap-2">
                <Download className="w-4 h-4" /> Télécharger
              </Button>
              <Button onClick={copyLink} variant="outline" className="rounded-xl gap-2">
                <Copy className="w-4 h-4" /> Copier le lien
              </Button>
              <Button onClick={printQR} variant="outline" className="rounded-xl gap-2">
                <Printer className="w-4 h-4" /> Imprimer
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="font-display font-semibold mb-3">Comment ça marche ?</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">1</div>
                  <div>
                    <p className="font-medium text-sm">Affichez le QR code</p>
                    <p className="text-xs text-muted-foreground">En vitrine, sur le comptoir, ou sur votre site web</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">2</div>
                  <div>
                    <p className="font-medium text-sm">Le client scanne</p>
                    <p className="text-xs text-muted-foreground">Avec l'appareil photo de son téléphone</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">3</div>
                  <div>
                    <p className="font-medium text-sm">Inscription instantanée</p>
                    <p className="text-xs text-muted-foreground">Le client reçoit sa carte de fidélité en 10 secondes</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/50">
              <h2 className="font-display font-semibold mb-2">Lien direct</h2>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-secondary px-3 py-2 rounded-lg flex-1 overflow-hidden text-ellipsis">{publicUrl}</code>
                <Button size="icon" variant="outline" className="rounded-xl shrink-0" onClick={() => window.open(publicUrl, "_blank")}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QRCodePage;
