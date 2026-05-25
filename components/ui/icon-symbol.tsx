// Original: Use Material Icons consistently across all platforms

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.back": "chevron-left",
  pencil: "edit",
  "trash.fill": "delete",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "xmark.circle.fill": "clear",
  plus: "add",
  checkmark: "check",
  "checkmark.fill": "check_circle",
  "megaphone.fill": "announcement",
  "bell.fill": "notifications",
  bell: "notifications",
  "person.crop.circle.fill": "account-circle",
  calendar: "event",
  "calendar.clear": "event",
  "star.fill": "emoji-events",
  "rectangle.portrait.and.arrow.right": "logout",
  archive: "archive",
  magnifyingglass: "search",
  "magnifyingglass.circle": "search",
  search: "search",
} as unknown as IconMapping;

// Additional modern icon mappings (Windows-style equivalents):
// - notice -> bell/notifications
// - event -> calendar/event
// - user -> person/account-circle
// - archive -> archive
// - home -> home (already mapped via house.fill)
const EXTRA_MAPPINGS = {
  "bell.fill": "notifications",
  notice: "notifications",
  event: "event",
  user: "person",
  "person.badge.plus": "person-add",
  usdr: "person",
  archive: "archive",
  home: "home",
  "play.fill": "play_arrow",
  "pause.fill": "pause",
  play: "play_arrow",
  pause: "pause",
  // Navigation & arrows
  back: "arrow-back",
  "arrow-back": "arrow-back",
  "arrow-back-ios": "arrow-back-ios",
  "arrow-forward": "arrow-forward",
  "arrow-forward-ios": "arrow-forward-ios",
  "arrow-up": "arrow-upward",
  "arrow-down": "arrow-downward",
  menu: "menu",
  "menu-outline": "menu",
  // Common app icons
  settings: "settings",
  "settings-outline": "settings",
  "person-outline": "person-outline",
  profile: "person",
  "person-circle": "account-circle",
  logout: "logout",
  "log-out": "logout",
  "log-out-outline": "logout",
  // Actions
  add: "add",
  "add-circle": "add-circle",
  "add-outline": "add",
  remove: "remove",
  "trash-outline": "delete",
  delete: "delete",
  edit: "edit",
  "create-outline": "edit",
  "pencil-outline": "edit",
  // Status
  checkmark: "check",
  "checkmark-circle": "check-circle",
  "checkmark-outline": "check",
  close: "close",
  "close-circle": "cancel",
  "close-outline": "close",
  warning: "warning",
  alert: "warning",
  "alert-circle": "error",
  "alert-outline": "warning",
  info: "info",
  "information-circle": "info",
  // Media
  image: "image",
  "image-outline": "image",
  photo: "photo",
  "camera-outline": "photo-camera",
  // Files
  document: "description",
  "document-outline": "description",
  file: "insert-drive-file",
  "file-tray": "folder",
  folder: "folder",
  "folder-outline": "folder",
  // Social
  share: "share",
  "share-outline": "share",
  "share-social": "share",
  send: "send",
  mail: "email",
  email: "email",
  "mail-outline": "email",
  // Map common Ionicons names used across the app to Material Icons equivalents
  "notifications-outline": "notifications",
  notifications: "notifications",
  "search-outline": "search",
  search: "search",
  "options-outline": "more-vert",
  "chevron-back": "chevron-left",
  "chevron-forward": "chevron-right",
  "expand-outline": "fullscreen",
  sparkles: "celebration",
  "open-outline": "open_in_new",
  "download-outline": "file_download",
  "copy-outline": "content_copy",
  "calendar-outline": "event",
  "location-outline": "place",
  "people-outline": "group",
  "swap-vertical": "swap_vert",
  camera: "photo_camera",
  pencil: "edit",
  "megaphone-outline": "announcement",
  "calendar-clear-outline": "event",
  "ribbon-outline": "emoji_events",
  "albums-outline": "collections",
  // Star/favorite
  star: "star",
  "star-outline": "star-border",
  heart: "favorite",
  "heart-outline": "favorite-border",
  // Time
  time: "schedule",
  "time-outline": "schedule",
  clock: "schedule",
  "clock-outline": "schedule",
  history: "history",
  // Misc
  filter: "filter-list",
  "filter-outline": "filter-list",
  sort: "sort",
  "sort-outline": "sort",
  refresh: "refresh",
  "refresh-outline": "refresh",
  "reload-outline": "refresh",
  ellipsis: "more-horiz",
  "ellipsis-horizontal": "more-horiz",
  "ellipsis-vertical": "more-vert",
  link: "link",
  "link-outline": "link",
  globe: "language",
  "globe-outline": "language",
  bookmark: "bookmark",
  "bookmark-outline": "bookmark-border",
  flag: "flag",
  "flag-outline": "outlined-flag",
  pin: "push-pin",
  "pin-outline": "push-pin",
  thumbsup: "thumb-up",
  "thumbsup-outline": "thumb-up-off-alt",
  campaign: "campaign",
  textformat: "format-size",
} as unknown as IconMapping;

// Merge mappings so callers can use either the SF symbol keys or simple names.
Object.assign(MAPPING, EXTRA_MAPPINGS);

/**
 * An icon component that uses Material Icons consistently across all platforms.
 * This ensures identical icon appearance on iOS, Android, and web.
 * Icon `name`s are mapped to Material Icons names.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
}) {
  // Use Material Icons consistently across all platforms
  const materialIconName = MAPPING[name];
  if (!materialIconName) {
    console.warn(
      `Icon "${name}" not found in Material Icons mapping. Available icons:`,
      Object.keys(MAPPING),
    );
    return null;
  }

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={materialIconName}
      style={style}
    />
  );
}
