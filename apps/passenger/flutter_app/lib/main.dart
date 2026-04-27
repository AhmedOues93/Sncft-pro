import 'package:flutter/material.dart';

void main() => runApp(const SncftApp());

class SncftApp extends StatelessWidget {
  const SncftApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SNCFT Navigator',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF003366)),
        scaffoldBackgroundColor: const Color(0xFFF2F5F9),
        useMaterial3: true,
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const AppShell()));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Text('SNCFT Navigator', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [const SearchScreen(), const PlaceholderScreen('Billets'), const PlaceholderScreen('Favoris'), const PlaceholderScreen('Profil')];

    return Scaffold(
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.search), label: 'Rechercher'),
          NavigationDestination(icon: Icon(Icons.confirmation_num_outlined), label: 'Billets'),
          NavigationDestination(icon: Icon(Icons.route), label: 'Trajets'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profil'),
        ],
      ),
    );
  }
}

class SearchScreen extends StatelessWidget {
  const SearchScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            height: 220,
            decoration: BoxDecoration(color: const Color(0xFF0A2C5A), borderRadius: BorderRadius.circular(24)),
            child: const Center(child: Text('Hero SNCFT', style: TextStyle(color: Colors.white, fontSize: 24))),
          ),
          const SizedBox(height: 16),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Recherche de trajet', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                SizedBox(height: 12),
                TextField(decoration: InputDecoration(labelText: 'Départ')),
                TextField(decoration: InputDecoration(labelText: 'Destination')),
                SizedBox(height: 12),
                FilledButton(onPressed: null, child: Text('Rechercher')),
              ]),
            ),
          ),
          const SizedBox(height: 12),
          ListTile(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            tileColor: Colors.white,
            title: const Text('Résultats (aperçu)'),
            subtitle: const Text('18:24 → 19:42 · 1 correspondance · 1.700 TND'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResultsScreen()));
            },
          ),
        ],
      ),
    );
  }
}

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Résultats')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: List.generate(5, (i) => Card(
          child: ListTile(
            title: Text('18:${20 + i} → 19:${40 + i}'),
            subtitle: const Text('A + D · Correspondance à Tunis Ville · 1.700 TND'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const JourneyDetailsScreen())),
          ),
        )),
      ),
    );
  }
}

class JourneyDetailsScreen extends StatelessWidget {
  const JourneyDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Détails du trajet')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          Text('Train A 508 · Train D 645', style: TextStyle(fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          Text('Correspondance 30 min à Tunis Ville'),
          SizedBox(height: 8),
          Text('18:24 Ezzouhour 2'),
          Text('19:35 Tunis Ville'),
          Text('20:05 Tunis Ville'),
          Text('20:42 Mellassine'),
          SizedBox(height: 12),
          Text('Tarif: 1.700 TND'),
        ],
      ),
    );
  }
}

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen(this.title, {super.key});
  final String title;

  @override
  Widget build(BuildContext context) => Center(child: Text('$title (placeholder)'));
}
