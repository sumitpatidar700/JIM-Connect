import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/src/utils/settings-effects';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
import { formatEventDate } from '@/src/utils/format';
import { PrimaryButton } from './PrimaryButton';

export function LogDetailModal({ visible, onClose, logItem }: any) {
  const themeColors = useThemeColors();

  if (!logItem) return null;

  const renderDetails = () => {
    const data = logItem.rawItem;
    if (!data) return <Text style={[styles.bodyText, { color: themeColors.muted }]}>No additional details available.</Text>;

    if (logItem.type === 'announcement') {
      return (
        <View style={styles.detailBlock}>
          <Text style={[styles.detailTitle, { color: themeColors.text }]}>Description</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>{data.description}</Text>
        </View>
      );
    }

    if (logItem.type === 'event') {
      return (
        <View style={styles.detailBlock}>
          <Text style={[styles.detailTitle, { color: themeColors.text }]}>Event Details</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>{data.description}</Text>
          <View style={styles.infoRow}>
            <IconSymbol name="calendar" color={themeColors.muted} size={16} />
            <Text style={[styles.infoText, { color: themeColors.muted }]}>
              {formatEventDate(data.date)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="mappin.and.ellipse" color={themeColors.muted} size={16} />
            <Text style={[styles.infoText, { color: themeColors.muted }]}>{data.venue}</Text>
          </View>
        </View>
      );
    }

    if (logItem.type === 'registration') {
      const studentName = data.users?.name || 'Unknown Student';
      const eventName = data.events?.title || 'Unknown Event';
      return (
        <View style={styles.detailBlock}>
          <Text style={[styles.detailTitle, { color: themeColors.text }]}>Registration Info</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>
            {studentName} has successfully registered for &quot;{eventName}&quot;.
          </Text>
          {data.users?.email && (
             <Text style={[styles.bodyText, { color: themeColors.muted, marginTop: spacing.sm }]}>Email: {data.users.email}</Text>
          )}
          {data.users?.phone && (
             <Text style={[styles.bodyText, { color: themeColors.muted }]}>Phone: {data.users.phone}</Text>
          )}
        </View>
      );
    }

    if (logItem.type === 'user') {
      return (
        <View style={styles.detailBlock}>
          <Text style={[styles.detailTitle, { color: themeColors.text }]}>Student Details</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>Name: {data.name}</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>Email: {data.email}</Text>
          {data.phone && <Text style={[styles.bodyText, { color: themeColors.text }]}>Phone: {data.phone}</Text>}
          {data.roll_number && <Text style={[styles.bodyText, { color: themeColors.text }]}>Roll Number: {data.roll_number}</Text>}
        </View>
      );
    }

    if (logItem.type === 'winner') {
      const eventTitle = data.events?.title || data.event?.title || 'Event';
      return (
        <View style={styles.detailBlock}>
          <Text style={[styles.detailTitle, { color: themeColors.text }]}>Winning Details</Text>
          <Text style={[styles.bodyText, { color: themeColors.text }]}>
            {data.name} secured the {data.position} position in &quot;{eventTitle}&quot;.
          </Text>
        </View>
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: logItem.color }]}>
              <IconSymbol name={logItem.icon} color={colors.white} size={24} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <IconSymbol name="xmark" color={themeColors.muted} size={20} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollArea}>
            <Text style={[styles.title, { color: themeColors.text }]}>{logItem.title}</Text>
            <Text style={[styles.subtitle, { color: themeColors.muted }]}>
              {logItem.subtitle} • {logItem.date.toLocaleDateString()} {logItem.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            
            {renderDetails()}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radii.xl,
    maxHeight: '80%',
    overflow: 'hidden',
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollArea: {
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.md,
    opacity: 0.6,
  },
  detailBlock: {
    marginBottom: spacing.md,
  },
  detailTitle: {
    fontFamily: typography.semiBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  bodyText: {
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
  }
});
