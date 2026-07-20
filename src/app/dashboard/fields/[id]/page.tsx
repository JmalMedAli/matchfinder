"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useFootballFieldDetail } from "@/hooks/use-football-fields";
import { useProfile } from "@/hooks/use-profile";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ReportDialog } from "@/components/admin/report-dialog";
import {
  MapPin, Star, Phone, Share2, ExternalLink, ArrowLeft, Users,
  Calendar, Clock, ChevronRight, Building2, CloudSun, Fence,
  Car, DoorOpen, Droplets, Lock, Lightbulb, Coffee, UtensilsCrossed,
  Wifi, Accessibility, Wrench, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Navigation, DollarSign
} from "lucide-react";

function getAmenities(field: Record<string, unknown>) {
  const items: { icon: React.ComponentType<{ className?: string }>; label: string; enabled: boolean }[] = [
    { icon: Car, label: "Parking", enabled: !!field.has_parking },
    { icon: DoorOpen, label: "Changing Rooms", enabled: !!field.has_changing_rooms },
    { icon: Droplets, label: "Showers", enabled: !!field.has_showers },
    { icon: Lock, label: "Lockers", enabled: !!field.has_lockers },
    { icon: Lightbulb, label: "Lighting", enabled: !!field.has_lighting },
    { icon: Coffee, label: "Cafeteria", enabled: !!field.has_cafeteria },
    { icon: UtensilsCrossed, label: "Toilets", enabled: !!field.has_toilets },
    { icon: Wrench, label: "Equipment Rental", enabled: !!field.has_equipment_rental },
    { icon: Wifi, label: "WiFi", enabled: !!field.has_wifi },
    { icon: Accessibility, label: "Accessibility", enabled: !!field.has_accessibility },
  ];
  return items;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu",
  friday: "Fri", saturday: "Sat", sunday: "Sun",
};

export default function FieldDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: field, isPending } = useFootballFieldDetail(id);
  const { data: profile } = useProfile();
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="min-h-screen pb-24 space-y-4">
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!field) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center">
        <p className="text-lg font-semibold mb-2">Field not found</p>
        <Button variant="outline" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const amenities = getAmenities(field as unknown as Record<string, unknown>);
  const enabledAmenities = amenities.filter((a) => a.enabled);
  const disabledAmenities = amenities.filter((a) => !a.enabled);
  const allPhotos = [field.image_url, ...(field.photos || [])].filter(Boolean) as string[];
  const hours = field.opening_hours as Record<string, { open: string; close: string } | null> | null;
  const today = new Date().toLocaleDateString("en", { weekday: "long" }).toLowerCase();

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: field!.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <motion.div
        className="relative -mx-4 -mt-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative h-64 sm:h-80 overflow-hidden rounded-b-2xl">
          <img
            src={allPhotos[0] || "/placeholder-field.jpg"}
            alt={field.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={handleShare}
              className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
            {field.phone && (
              <a
                href={`tel:${field.phone}`}
                className="h-10 w-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Photo count */}
          {allPhotos.length > 1 && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-medium rounded-full px-3 py-1.5"
            >
              📷 {allPhotos.length} photos
            </button>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-4 left-4 right-20">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                {field.is_indoor ? <Building2 className="h-3 w-3 mr-1" /> : <CloudSun className="h-3 w-3 mr-1" />}
                {field.is_indoor ? "Indoor" : "Outdoor"}
              </Badge>
              {field.price_range && (
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                  <DollarSign className="h-3 w-3 mr-0.5" />
                  {field.price_range}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Title + Rating */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <h1 className="text-2xl font-bold font-[family-name:var(--font-barlow-condensed)] leading-tight">
          {field.name}
        </h1>
        <div className="flex items-center gap-3 mt-1.5">
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {field.address || field.city}
          </p>
          {field.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-semibold">{field.rating.toFixed(1)}</span>
              {field.review_count > 0 && (
                <span className="text-xs text-muted-foreground">({field.review_count} reviews)</span>
              )}
            </div>
          )}
          <ReportDialog targetType="field" targetId={field.id} />
        </div>
      </motion.div>

      {/* Quick Info Badges */}
      <motion.div
        className="flex gap-2 mb-4 overflow-x-auto scrollbar-none"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Badge variant="secondary" className="shrink-0">
          <Fence className="h-3 w-3 mr-1" />
          {field.surface_type}
        </Badge>
        {field.dimensions && (
          <Badge variant="secondary" className="shrink-0">
            {field.dimensions}
          </Badge>
        )}
        {field.match_count > 0 && (
          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20">
            <Users className="h-3 w-3 mr-1" />
            {field.match_count} match{field.match_count !== 1 ? "es" : ""} available
          </Badge>
        )}
      </motion.div>

      {/* Description */}
      {field.description && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            {field.description}
          </p>
        </motion.section>
      )}

      {/* Amenities */}
      {(enabledAmenities.length > 0 || disabledAmenities.length > 0) && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Amenities
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {enabledAmenities.map((a) => (
              <div key={a.label} className="flex items-center gap-2.5 bg-muted/50 rounded-xl px-3 py-2.5">
                <a.icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">{a.label}</span>
                <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
              </div>
            ))}
          </div>
          {disabledAmenities.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {disabledAmenities.map((a) => (
                <div key={a.label} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 opacity-50">
                  <a.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-muted-foreground">{a.label}</span>
                  <XCircle className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                </div>
              ))}
            </div>
          )}
        </motion.section>
      )}

      {/* Opening Hours */}
      {hours && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Opening Hours
          </h2>
          <div className="bg-card border rounded-2xl overflow-hidden">
            {DAYS.slice(0, showAllHours ? 7 : 3).map((day) => {
              const h = hours[day];
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`flex items-center justify-between px-4 py-2.5 text-sm ${isToday ? "bg-primary/5 font-semibold" : ""} ${day !== "sunday" ? "border-b border-border/50" : ""}`}
                >
                  <span className={isToday ? "text-primary" : ""}>
                    {DAY_LABELS[day]} {isToday && "· Today"}
                  </span>
                  {h ? (
                    <span className="text-muted-foreground">{h.open} – {h.close}</span>
                  ) : (
                    <span className="text-destructive">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
          {DAYS.length > 3 && (
            <button
              onClick={() => setShowAllHours(!showAllHours)}
              className="flex items-center gap-1 text-xs text-primary font-medium mt-2"
            >
              {showAllHours ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showAllHours ? "Show less" : `Show all ${DAYS.length} days`}
            </button>
          )}
        </motion.section>
      )}

      {/* Contact */}
      {field.phone && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contact
          </h2>
          <a
            href={`tel:${field.phone}`}
            className="flex items-center gap-3 bg-card border rounded-2xl p-4 active:scale-[0.98] transition-transform"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{field.phone}</p>
              <p className="text-xs text-muted-foreground">Tap to call</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </motion.section>
      )}

      {/* Gallery */}
      {allPhotos.length > 1 && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Gallery
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {allPhotos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setSelectedPhoto(photo)}
                className="shrink-0"
              >
                <img
                  src={photo}
                  alt={`${field.name} photo ${i + 1}`}
                  className="h-24 w-24 rounded-xl object-cover border active:scale-95 transition-transform"
                />
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Map */}
      {field.latitude && field.longitude && (
        <motion.section
          className="mb-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.45 }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Location
          </h2>
          <div className="h-48 rounded-2xl overflow-hidden border mb-3">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${field.longitude - 0.01}%2C${field.latitude - 0.01}%2C${field.longitude + 0.01}%2C${field.latitude + 0.01}&layer=mapnik&marker=${field.latitude}%2C${field.longitude}`}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${field.latitude},${field.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-primary"
          >
            <Navigation className="h-4 w-4" />
            Get directions
            <ExternalLink className="h-3 w-3" />
          </a>
        </motion.section>
      )}

      {/* Available Matches */}
      <motion.section
        className="mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Available Matches
          </h2>
          <Badge variant="secondary" className="text-xs">
            {field.upcoming_matches.length}
          </Badge>
        </div>

        {field.upcoming_matches.length === 0 ? (
          <div className="bg-card border rounded-2xl p-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold text-sm mb-1">No upcoming matches</p>
            <p className="text-xs text-muted-foreground">
              Create a match at this field to get started
            </p>
            <Button
              size="sm"
              className="mt-3 rounded-full"
              onClick={() => router.push(`/dashboard/matches/new?field=${field.id}`)}
            >
              Create match here
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {field.upcoming_matches.map((match, i) => {
              const date = new Date(match.date);
              const spotsLeft = match.max_players - match.accepted_count;
              const organizer = match.organizer as { name: string | null; image: string | null } | null;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                >
                  <button
                    onClick={() => router.push(`/dashboard/matches/${match.id}`)}
                    className="w-full text-left bg-card border rounded-2xl p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      {/* Date block */}
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary leading-none">
                          {date.getDate()}
                        </span>
                        <span className="text-[9px] font-medium text-primary/60 uppercase">
                          {date.toLocaleString("default", { month: "short" })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{match.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {organizer && (
                            <span className="flex items-center gap-1">
                              · {organizer.name ?? "Organizer"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {match.position_needed && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {match.position_needed}
                            </Badge>
                          )}
                          {match.price_per_person != null && match.price_per_person > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 text-amber-600">
                              {match.price_per_person} TND
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-sm font-bold ${spotsLeft === 0 ? "text-muted-foreground" : "text-primary"}`}>
                          {match.accepted_count}/{match.max_players}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {spotsLeft === 0 ? "Full" : `${spotsLeft} left`}
                        </p>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Fullscreen Photo Viewer */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
            <img
              src={selectedPhoto}
              alt="Field photo"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Gallery Viewer */}
      <AnimatePresence>
        {showAllPhotos && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between p-4">
              <p className="text-white text-sm font-medium">{allPhotos.length} photos</p>
              <button
                onClick={() => setShowAllPhotos(false)}
                className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {allPhotos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`${field.name} ${i + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
