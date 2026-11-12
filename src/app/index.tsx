import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useSchedule } from "@/hooks/use-schedule";
import { useTheme } from "@/hooks/use-theme";
import { Course } from "@/lib/ics";

function formatCourseDateTime(start: number, end: number) {
  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
  const s = new Date(start);
  const e = new Date(end);
  return `${dateFmt.format(s)} • ${timeFmt.format(s)} - ${timeFmt.format(e)}`;
}

function formatLastSync(lastSync: number | null): string {
  if (!lastSync) return "--:--";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(lastSync));
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { courses, lastSync, isSyncing, error, isStale, refresh } =
    useSchedule();

  const renderItem = ({ item }: { item: Course }) => {
    const roomText = item.room ?? "salle non communiquée";
    const timeText = formatCourseDateTime(item.start, item.end);

    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold" style={styles.timeText}>
            {timeText}
          </ThemedText>
        </View>

        <ThemedText type="default" style={styles.titleText}>
          {item.title}
        </ThemedText>

        <View style={styles.cardFooter}>
          <ThemedText type="small" themeColor="textSecondary">
            Salle : {roomText}
          </ThemedText>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={refresh}
            tintColor={theme.text}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="title">Emploi du temps</ThemedText>

            <View style={styles.metaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                {isSyncing
                  ? "Synchronisation en cours..."
                  : `Dernière synchro : ${formatLastSync(lastSync)}`}
              </ThemedText>
              {courses.length > 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  {courses.length} cours
                </ThemedText>
              )}
            </View>

            {isStale && (
              <View style={styles.staleBanner}>
                <ThemedText type="smallBold" style={styles.staleText}>
                  Données anciennes (&gt; 24h)
                </ThemedText>
              </View>
            )}

            {error && (
              <View style={styles.errorBanner}>
                <ThemedText type="small" style={styles.errorText}>
                  Réseau indisponible ({error}). Dernier flux valide conservé.
                </ThemedText>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          !isSyncing ? (
            <View style={styles.emptyContainer}>
              <ThemedText type="default">Aucun cours trouvé</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Tirez vers le bas pour rafraîchir le calendrier.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={theme.text} />
              <ThemedText type="small" themeColor="textSecondary">
                Chargement des cours...
              </ThemedText>
            </View>
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    maxWidth: MaxContentWidth,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  header: {
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  staleBanner: {
    backgroundColor: "#F59E0B22",
    borderColor: "#F59E0B88",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  staleText: {
    color: "#D97706",
  },
  errorBanner: {
    backgroundColor: "#EF444422",
    borderColor: "#EF444488",
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  errorText: {
    color: "#DC2626",
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    opacity: 0.85,
  },
  titleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: Spacing.one,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
});
