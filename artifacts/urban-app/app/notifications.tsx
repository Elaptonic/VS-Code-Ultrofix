import { Icon as Feather } from "@/components/Icon";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { useUserId } from "@/constants/user";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isIOS = Platform.OS === "ios";
  const userId = useUserId();

  const { data: notifications, isLoading } = useListNotifications({ userId });

  const markRead = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListNotificationsQueryKey({ userId }),
        });
      },
    },
  });

  const markAllRead = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListNotificationsQueryKey({ userId }),
        });
      },
    },
  });

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  const handleMarkAll = () => {
    markAllRead.mutate({ data: { userId } });
  };

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isIOS ? (
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
            },
          ]}
        >
          <HeaderContent
            router={router}
            unreadCount={unreadCount}
            onMarkAll={handleMarkAll}
            colors={colors}
          />
        </BlurView>
      ) : (
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12,
              borderBottomColor: colors.border,
              borderBottomWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <HeaderContent
            router={router}
            unreadCount={unreadCount}
            onMarkAll={handleMarkAll}
            colors={colors}
          />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : !notifications || notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="bell-off" size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No notifications yet
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
              You'll be notified about your bookings and offers here
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <Pressable
              key={notif.id}
              onPress={() => !notif.read && handleMarkRead(notif.id)}
              style={({ pressed }) => [
                styles.notifItem,
                {
                  backgroundColor: !notif.read ? colors.accent : colors.glass,
                  borderColor: !notif.read ? colors.primary + "50" : colors.glassBorder,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View
                style={[
                  styles.notifIcon,
                  { backgroundColor: (notif.iconColor || "#38BDF8") + "22" },
                ]}
              >
                <Feather
                  name={(notif.icon || "bell") as any}
                  size={20}
                  color={notif.iconColor || "#38BDF8"}
                />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifTitleRow}>
                  <Text
                    style={[styles.notifTitle, { color: colors.foreground }]}
                    numberOfLines={1}
                  >
                    {notif.title}
                  </Text>
                  {!notif.read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <Text
                  style={[styles.notifBody, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {notif.body}
                </Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground }]}>
                  {timeAgo(notif.createdAt)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function HeaderContent({
  router,
  unreadCount,
  onMarkAll,
  colors,
}: {
  router: any;
  unreadCount: number;
  onMarkAll: () => void;
  colors: any;
}) {
  return (
    <View style={styles.headerContent}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <Feather name="arrow-left" size={22} color={colors.foreground} />
      </Pressable>
      <View>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {unreadCount > 0 && (
          <Text style={[styles.unread, { color: colors.primary }]}>
            {unreadCount} unread
          </Text>
        )}
      </View>
      <Pressable onPress={onMarkAll} hitSlop={8}>
        <Text style={[styles.markRead, { color: colors.primary }]}>Mark all read</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  unread: { fontSize: 11, textAlign: "center" },
  markRead: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 10 },
  center: { alignItems: "center", paddingTop: 80 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  notifItem: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8, flexShrink: 0 },
  notifBody: { fontSize: 13, lineHeight: 19 },
  notifTime: { fontSize: 11, marginTop: 2 },
});
