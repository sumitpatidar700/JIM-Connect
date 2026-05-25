import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function WinnersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Winners</Text>
      <Text>Winners will be displayed here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
