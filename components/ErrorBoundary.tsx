import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Colors from "@/constants/colors";

interface State {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.log("ErrorBoundary caught", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary">
          <Text style={styles.title}>Oups…</Text>
          <Text style={styles.subtitle}>{this.state.message ?? "Un problème est survenu."}</Text>
          <Pressable onPress={() => this.setState({ hasError: false, message: null })} style={styles.btn}>
            <Text style={styles.btnText}>Réessayer</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.palette.beige, padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.palette.taupeDeep },
  subtitle: { color: Colors.palette.taupe, textAlign: "center" },
  btn: { backgroundColor: Colors.palette.accentGold, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, marginTop: 8 },
  btnText: { color: Colors.palette.taupeDeep, fontWeight: "800" },
});