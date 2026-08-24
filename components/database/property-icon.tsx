import {
  Activity,
  Airplay,
  AlarmClock,
  Anchor,
  Aperture,
  Archive,
  AtSign,
  Award,
  BadgeCheck,
  Banknote,
  Bell,
  Bike,
  Bird,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  Bus,
  Cake,
  Calendar,
  Camera,
  Car,
  Cat,
  Check,
  CircleUserRound,
  Cloud,
  Coffee,
  Compass,
  Crown,
  Dog,
  Download,
  Dumbbell,
  Eye,
  Feather,
  Film,
  Fish,
  Flag,
  Flower2,
  Folder,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  Hammer,
  Hand,
  Headphones,
  Heart,
  Home,
  Image,
  Key,
  Lamp,
  Laptop,
  Leaf,
  Lightbulb,
  Link2,
  Lock,
  Mail,
  MapPin,
  Mic,
  Monitor,
  Moon,
  Mountain,
  Music,
  Package,
  Palette,
  PawPrint,
  PenTool,
  Phone,
  Plane,
  Plug,
  Rocket,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Smile,
  Sparkles,
  Star,
  Sun,
  Tag,
  Tent,
  ThumbsUp,
  Train,
  TreePine,
  Trophy,
  Truck,
  Umbrella,
  User,
  Users,
  Video,
  Wallet,
  Watch,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  getNotionPropertyIcon,
  isLucidePropertyIconId,
  isPropertyIconId,
  type LucidePropertyIconId,
  type PropertyIconId,
} from "@/lib/property-icons";
import { cn } from "@/lib/utils";
import type { DatabaseProperty } from "./types";
import { PROPERTY_TYPE_OPTIONS } from "./property-types";

export const PROPERTY_ICON_COMPONENTS: Record<
  LucidePropertyIconId,
  LucideIcon
> = {
  activity: Activity,
  airplay: Airplay,
  "alarm-clock": AlarmClock,
  anchor: Anchor,
  aperture: Aperture,
  archive: Archive,
  "at-sign": AtSign,
  award: Award,
  "badge-check": BadgeCheck,
  banknote: Banknote,
  bell: Bell,
  bike: Bike,
  bird: Bird,
  "book-open": BookOpen,
  box: Box,
  briefcase: Briefcase,
  building: Building2,
  bus: Bus,
  cake: Cake,
  calendar: Calendar,
  camera: Camera,
  car: Car,
  cat: Cat,
  check: Check,
  "circle-user": CircleUserRound,
  cloud: Cloud,
  coffee: Coffee,
  compass: Compass,
  crown: Crown,
  dog: Dog,
  download: Download,
  dumbbell: Dumbbell,
  eye: Eye,
  feather: Feather,
  film: Film,
  fish: Fish,
  flag: Flag,
  flower: Flower2,
  folder: Folder,
  gamepad: Gamepad2,
  gift: Gift,
  globe: Globe,
  "graduation-cap": GraduationCap,
  hammer: Hammer,
  hand: Hand,
  headphones: Headphones,
  heart: Heart,
  home: Home,
  image: Image,
  key: Key,
  lamp: Lamp,
  laptop: Laptop,
  leaf: Leaf,
  lightbulb: Lightbulb,
  link: Link2,
  lock: Lock,
  mail: Mail,
  "map-pin": MapPin,
  mic: Mic,
  monitor: Monitor,
  moon: Moon,
  mountain: Mountain,
  music: Music,
  package: Package,
  palette: Palette,
  "paw-print": PawPrint,
  "pen-tool": PenTool,
  phone: Phone,
  plane: Plane,
  plug: Plug,
  rocket: Rocket,
  search: Search,
  settings: Settings,
  shield: Shield,
  "shopping-cart": ShoppingCart,
  smile: Smile,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  tag: Tag,
  tent: Tent,
  "thumbs-up": ThumbsUp,
  train: Train,
  "tree-pine": TreePine,
  trophy: Trophy,
  truck: Truck,
  umbrella: Umbrella,
  user: User,
  users: Users,
  video: Video,
  wallet: Wallet,
  watch: Watch,
  wifi: Wifi,
  wrench: Wrench,
  zap: Zap,
};

export function PropertyIconGlyph({
  iconId,
  className,
}: {
  iconId: PropertyIconId;
  className?: string;
}) {
  const notionIcon = getNotionPropertyIcon(iconId);
  if (notionIcon) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
        className={cn("size-4 shrink-0", className)}
      >
        {notionIcon.paths.map((path) => (
          <path key={path} d={path} />
        ))}
      </svg>
    );
  }

  if (!isLucidePropertyIconId(iconId)) return null;
  const Icon = PROPERTY_ICON_COMPONENTS[iconId];
  return <Icon className={cn("size-4 shrink-0", className)} />;
}

export function PropertyIcon({
  property,
  className,
}: {
  property: DatabaseProperty;
  className?: string;
}) {
  if (property.icon && isPropertyIconId(property.icon)) {
    return <PropertyIconGlyph iconId={property.icon} className={className} />;
  }

  const FallbackIcon =
    PROPERTY_TYPE_OPTIONS.find((option) => option.type === property.type)
      ?.icon ?? PROPERTY_TYPE_OPTIONS[0].icon;

  return <FallbackIcon className={cn("size-4 shrink-0", className)} />;
}
