import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { AmbientBackground } from "@/components/ui/ambient-background";
import { GlassSurface } from "@/components/ui/glass-surface";
import { FontFamilies, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { FlatGroup, GeiiGroupSection, groupBySection } from "@/lib/geii-api";
import { haptics } from "@/lib/haptics";

export type ClassPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  groups: FlatGroup[];
  activeGroupId: string;
  onSelectGroup: (groupId: string) => void;
};

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function ClassPickerModal({
  visible,
  onClose,
  groups,
  activeGroupId,
  onSelectGroup,
}: ClassPickerModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const accent = theme.accentTiers;

  const [query, setQuery] = useState("");

  const sections: GeiiGroupSection[] = useMemo(() => {
    const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);

    const filtered =
      terms.length === 0
        ? groups
        : groups.filter((g) => {
            const haystack = normalizeSearch(
              `${g.text} ${g.section} ${g.path.join(" ")}`
            );
            return terms.every((t) => haystack.includes(t));
          });

    return groupBySection(filtered);
  }, [groups, query]);

  const handleClose = () => {
    haptics.tap();
    setQuery("");
    onClose();
  };

  const handleChoose = (groupId: string) => {
    haptics.selection();
    setQuery("");
    onSelectGroup(groupId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "overFullScreen"}
      transparent={Platform.OS !== "ios"}
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <AmbientBackground />

        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBlock}>
              <ThemedText type="subtitle" numberOfLines={1}>
                Classe GEII
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {groups.length} classes · Emploi du temps en direct
              </ThemedText>
            </View>

            <Pressable
              onPress={handleClose}
              hitSlop={6}
              accessibilityLabel="Fermer"
            >
              <GlassSurface
                glassEffectStyle="regular"
                isInteractive={true}
                style={styles.closeCircle}
                fallbackStyle={{
                  backgroundColor: theme.backgroundSelected,
                  borderColor: theme.border,
                }}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={17}
                  weight="semibold"
                  tintColor={theme.text}
                />
              </GlassSurface>
            </Pressable>
          </View>

          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              size={15}
              tintColor={theme.textMuted}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher (ex. ESEA, BUT1, E11A, A2I, APP...)"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: theme.text }]}
            />
            {query.length > 0 && Platform.OS !== "ios" && (
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setQuery("");
                }}
                hitSlop={8}
              >
                <SymbolView
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  size={16}
                  tintColor={theme.textMuted}
                />
              </Pressable>
            )}
          </View>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, Spacing.three) + Spacing.two },
          ]}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText type="overline" themeColor="textSecondary">
                {section.title}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            const isSelected = item.id === activeGroupId;

            return (
              <Pressable
                onPress={() => handleChoose(item.id)}
                style={[
                  styles.groupRow,
                  {
                    backgroundColor: isSelected ? accent.subtleBg : theme.cardBg,
                    borderColor: isSelected ? accent.primary : theme.cardBorder,
                  },
                ]}
              >
                <ThemedText
                  type={isSelected ? "smallBold" : "headline"}
                  style={[
                    styles.groupName,
                    isSelected && { color: accent.primary },
                  ]}
                  numberOfLines={1}
                >
                  {item.text}
                </ThemedText>

                {isSelected && (
                  <SymbolView
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    size={18}
                    tintColor={accent.primary}
                  />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: theme.cardBgSubtle,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <SymbolView
                name={{
                  ios: "magnifyingglass",
                  android: "search_off",
                  web: "search_off",
                }}
                size={24}
                tintColor={theme.textMuted}
              />
              <ThemedText type="headline">Aucune classe trouvée</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Essayez un autre nom de groupe ou de semestre.
              </ThemedText>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerTitleBlock: {
    flex: 1,
    gap: 2,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderRadius: Radius.lg,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamilies.bodyMedium,
    fontSize: 14,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: 6,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  groupName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  emptyBox: {
    marginTop: Spacing.four,
    borderRadius: Radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.five,
    alignItems: "center",
    gap: 6,
  },
});
