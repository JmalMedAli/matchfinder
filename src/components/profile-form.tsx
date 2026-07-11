"use client";

import { useState, useRef } from "react";
import { useProfile, useUpdateProfile, useUploadAvatar } from "@/hooks/use-profile";
import type { ProfileUpdate } from "@/types/profile";
import { FOOTBALL_POSITIONS } from "@/types/profile";
import { TUNISIA_CITIES } from "@/lib/geo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Camera, Save, Loader2 } from "lucide-react";

export function ProfileForm() {
  const { data: profile, isPending } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileUpdate>({});
  const [dirty, setDirty] = useState(false);

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full animate-pulse bg-muted" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (!profile) return null;

  const set = <K extends keyof ProfileUpdate>(key: K, value: ProfileUpdate[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const get = <K extends keyof ProfileUpdate>(key: K, fallback: NonNullable<ProfileUpdate[K]>) => {
    return (form[key] ?? profile[key] ?? fallback) as NonNullable<ProfileUpdate[K]>;
  };

  const getBool = (key: keyof ProfileUpdate) => {
    return (form[key] ?? profile[key] ?? false) as boolean;
  };

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }

    setPreview(URL.createObjectURL(file));

    try {
      const url = await uploadAvatar.mutateAsync(file);
      set("image", url);
      toast.success("Avatar uploaded");
    } catch {
      toast.error("Failed to upload image");
      setPreview(null);
    }
  }

  async function handleSave() {
    const updates: ProfileUpdate = {
      name: get("name", ""),
      position: get("position", ""),
      city: get("city", ""),
      bio: get("bio", ""),
      phone: get("phone", ""),
      whatsapp: get("whatsapp", ""),
      facebook: get("facebook", ""),
      instagram: get("instagram", ""),
      show_phone: getBool("show_phone"),
      show_whatsapp: getBool("show_whatsapp"),
      show_facebook: getBool("show_facebook"),
      show_instagram: getBool("show_instagram"),
      image: form.image ?? profile?.image ?? undefined,
    };

    try {
      await updateProfile.mutateAsync(updates);
      setDirty(false);
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  const avatarSrc = preview ?? profile.image ?? undefined;
  const initials = (get("name", "") || profile.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow-md hover:bg-primary/80 transition-colors"
              >
                <Camera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
            {uploadAvatar.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Uploading...
              </p>
            )}
            <p className="text-xs text-muted-foreground">Max 2 MB. JPG, PNG, WebP.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input
              value={get("name", "")}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Position</label>
            <select
              value={get("position", "")}
              onChange={(e) => set("position", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select position</option>
              {FOOTBALL_POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">City</label>
            <select
              value={get("city", "")}
              onChange={(e) => set("city", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select city</option>
              {TUNISIA_CITIES.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={get("bio", "")}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Tell others about yourself..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContactField
            label="Phone"
            value={get("phone", "")}
            onChange={(v) => set("phone", v)}
            show={getBool("show_phone")}
            onToggle={() => set("show_phone", !getBool("show_phone"))}
            placeholder="+216 XX XXX XXX"
          />
          <ContactField
            label="WhatsApp"
            value={get("whatsapp", "")}
            onChange={(v) => set("whatsapp", v)}
            show={getBool("show_whatsapp")}
            onToggle={() => set("show_whatsapp", !getBool("show_whatsapp"))}
            placeholder="+216 XX XXX XXX"
          />
          <ContactField
            label="Facebook"
            value={get("facebook", "")}
            onChange={(v) => set("facebook", v)}
            show={getBool("show_facebook")}
            onToggle={() => set("show_facebook", !getBool("show_facebook"))}
            placeholder="Facebook profile URL"
          />
          <ContactField
            label="Instagram"
            value={get("instagram", "")}
            onChange={(v) => set("instagram", v)}
            show={getBool("show_instagram")}
            onToggle={() => set("show_instagram", !getBool("show_instagram"))}
            placeholder="@username"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!dirty || updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save profile
        </Button>
      </div>
    </div>
  );
}

function ContactField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <button
          type="button"
          onClick={onToggle}
          className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          role="switch"
          aria-checked={show}
        >
          <span
            className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
              show ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {show ? "Visible to others" : "Hidden from others"}
      </p>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
