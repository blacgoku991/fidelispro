import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PermissionState {
  notifications: "granted" | "denied" | "default" | "unsupported";
  geolocation: "granted" | "denied" | "prompt" | "unsupported";
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<PermissionState>({
    notifications: "default",
    geolocation: "prompt",
  });

  useEffect(() => {
    // Check notification support
    if (!("Notification" in window)) {
      setPermissions((p) => ({ ...p, notifications: "unsupported" }));
    } else {
      setPermissions((p) => ({ ...p, notifications: Notification.permission as any }));
    }

    // Check geolocation support
    if (!("geolocation" in navigator)) {
      setPermissions((p) => ({ ...p, geolocation: "unsupported" }));
    } else if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissions((p) => ({ ...p, geolocation: result.state as any }));
        result.onchange = () => {
          setPermissions((p) => ({ ...p, geolocation: result.state as any }));
        };
      }).catch(() => {});
    }
  }, []);

  const requestNotifications = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Les notifications ne sont pas supportées sur cet appareil");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermissions((p) => ({ ...p, notifications: result as any }));
    if (result === "granted") {
      toast.success("Notifications activées !");
      return true;
    } else {
      toast.error("Notifications refusées. Vous pouvez les activer dans les réglages.");
      return false;
    }
  };

  const requestGeolocation = (): Promise<GeolocationPosition | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) {
        toast.error("La géolocalisation n'est pas supportée sur cet appareil");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPermissions((p) => ({ ...p, geolocation: "granted" }));
          toast.success("Localisation activée !");
          resolve(position);
        },
        (error) => {
          setPermissions((p) => ({ ...p, geolocation: "denied" }));
          toast.error("Localisation refusée. Vous pouvez l'activer dans les réglages.");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  return { permissions, requestNotifications, requestGeolocation };
}
