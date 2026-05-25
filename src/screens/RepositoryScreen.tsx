import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RepositoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Repository</Text>
      <Text>Past events and resources will be shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});
