import React, { useState } from "react";
import { View, StyleSheet, Text, Switch, Pressable } from "react-native";
import Colors from "@/constants/colors";
import { useNotifications } from "@/providers/NotificationsProvider";

export default function SettingsScreen() {
  const [privacy, setPrivacy] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<boolean>(true);
  const { permissionStatus, requestPermissions, scheduleLocalNotification } = useNotifications();

  return (
    <View style={styles.container} testID="settings-screen">
      <Text style={styles.title}>Préférences</Text>

      <View style={styles.row}>
        <Text style={styles.rowText}>Compte privé</Text>
        <Switch value={privacy} onValueChange={setPrivacy} accessibilityRole="switch" accessibilityLabel="Activer compte privé" />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowText}>Notifications</Text>
        <Switch value={notifications} onValueChange={setNotifications} accessibilityRole="switch" accessibilityLabel="Activer notifications" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications (permissions)</Text>
        <View style={styles.row}>
          <Text style={styles.rowText}>Statut</Text>
          <Text style={styles.status} testID="notif-status">{permissionStatus}</Text>
        </View>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Demander la permission de notifications"
            onPress={requestPermissions}
            style={[styles.actionBtn, styles.primaryBtn]}
            testID="ask-permission"
          >
            <Text style={styles.primaryText}>Demander</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Envoyer une notification de test"
            onPress={async () => {
              await scheduleLocalNotification('Test notification', "Ceci est une notification locale de test");
            }}
            style={[styles.actionBtn, styles.secondaryBtn]}
            testID="test-local-notification"
          >
            <Text style={styles.secondaryText}>Notification test</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.palette.beige, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.palette.taupeDeep, marginBottom: 12 },
  row: {
    backgroundColor: Colors.palette.cream,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.palette.taupeSoft,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { color: Colors.palette.taupeDeep, fontWeight: "600" },
  section: { marginTop: 16 },
  sectionTitle: { color: Colors.palette.taupeDeep, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  status: { color: Colors.palette.taupeDeep, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  primaryBtn: { backgroundColor: '#000', borderWidth: 1, borderColor: '#000' },
  primaryText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.palette.cream, borderWidth: 1, borderColor: Colors.palette.taupeSoft },
  secondaryText: { color: Colors.palette.taupeDeep, fontWeight: '800' },
});