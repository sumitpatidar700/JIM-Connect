import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';

const bentoCards = [
  {
    title: 'Announcements',
    description: 'See the latest campus updates',
    image: require('../../assets/images/clg_logo.png'),
    route: 'Announcements',
    color: '#E6F4FE',
  },
  {
    title: 'Events',
    description: 'Register for upcoming events',
    image: require('../../assets/images/jim-logo.png'),
    route: 'Events',
    color: '#FFF6E6',
  },
  {
    title: 'Winners',
    description: 'View event winners',
    image: require('../../assets/images/clg_logo.png'),
    route: 'Winners',
    color: '#E6FFE6',
  },
  {
    title: 'Repository',
    description: 'Explore past events',
    image: require('../../assets/images/jim-logo.png'),
    route: 'Repository',
    color: '#F0E6FF',
  },
  {
    title: 'Profile',
    description: 'Your account & settings',
    image: require('../../assets/images/clg_logo.png'),
    route: 'Profile',
    color: '#F6F6F6',
  },
];

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.header}>Welcome to JI-Connect</Text>
      <View style={styles.grid}>
        {bentoCards.map((card, idx) => (
          <TouchableOpacity
            key={card.title}
            style={[styles.card, { backgroundColor: card.color, marginRight: idx % 2 === 0 ? 12 : 0 }]}
            onPress={() => navigation?.navigate(card.route)}
            activeOpacity={0.85}
          >
            <Image source={card.image} style={styles.cardImage} />
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 28,
    fontFamily: 'Manrope_700Bold',
    marginBottom: 24,
    color: '#222',
    textAlign: 'left',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  card: {
    width: '46%',
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: {
    width: 38,
    height: 38,
    marginBottom: 12,
    borderRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    color: '#222',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#444',
    opacity: 0.8,
  },
});
