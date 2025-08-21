import React, { useState } from "react";
import { View, StyleSheet, Text, Switch } from "react-native";
import Colors from "@/constants/colors";

export default function SettingsScreen() {
  const [privacy, setPrivacy] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<boolean>(true);

  return (
    <View style={styles.container} testID="settings-screen">
      <Text style={styles.title}>Préférences</Text>

      <View style={styles.row}>
        <Text style={styles.rowText}>Compte privé</Text>
        <Switch value={privacy} onValueChange={setPrivacy} />
      </View>

      <View style={styles.row}>
        <Text style={styles.rowText}>Notifications</Text>
        <Switch value={notifications} onValueChange={setNotifications} />
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
});