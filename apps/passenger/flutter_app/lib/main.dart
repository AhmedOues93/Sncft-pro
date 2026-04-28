import 'dart:ui';
import 'package:flutter/material.dart';

void main() => runApp(const SncftApp());

class SncftApp extends StatelessWidget {
  const SncftApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SNCFT Navigator',
      debugShowCheckedModeBanner: false,
      theme: SncftTheme.theme,
      home: const SplashScreen(),
    );
  }
}

class SncftTheme {
  static const navy = Color(0xFF061B35);
  static const navy2 = Color(0xFF0B2D57);
  static const blue = Color(0xFF1267D8);
  static const teal = Color(0xFF18B7C8);
  static const soft = Color(0xFFF3F6FB);
  static const ink = Color(0xFF132033);
  static const muted = Color(0xFF6B7890);

  static ThemeData get theme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: soft,
      fontFamily: 'Arial',
      colorScheme: ColorScheme.fromSeed(
        seedColor: blue,
        primary: blue,
        secondary: teal,
        surface: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        elevation: 0,
        backgroundColor: soft,
        foregroundColor: ink,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF7F9FC),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(18),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}

class HeroSlide {
  const HeroSlide(this.asset, this.title, this.subtitle);
  final String asset;
  final String title;
  final String subtitle;
}

const heroSlides = [
  HeroSlide('assets/images/train_1.png', 'Voyagez autrement', 'Horaires SNCFT en temps réel'),
  HeroSlide('assets/images/train_2.png', 'Connectez vos trajets', 'Lignes A, D et E en un seul plan'),
  HeroSlide('assets/images/train_3.png', 'Tunis à portée de main', 'Arrêts, correspondances et tarifs'),
];

class Journey {
  const Journey({
    required this.departure,
    required this.arrival,
    required this.origin,
    required this.destination,
    required this.duration,
    required this.badge,
    required this.train,
    required this.fare,
    required this.isTransfer,
    this.transfer,
    this.overnight = false,
  });

  final String departure;
  final String arrival;
  final String origin;
  final String destination;
  final String duration;
  final String badge;
  final String train;
  final String fare;
  final bool isTransfer;
  final String? transfer;
  final bool overnight;
}

const demoJourneys = [
  Journey(
    departure: '08:15',
    arrival: '09:00',
    origin: 'Tunis Ville',
    destination: 'Hammam Lif',
    duration: '45 min',
    badge: 'A',
    train: 'Train A101',
    fare: '1.700 TND',
    isTransfer: false,
  ),
  Journey(
    departure: '09:30',
    arrival: '10:15',
    origin: 'Tunis Ville',
    destination: 'Hammam Lif',
    duration: '45 min',
    badge: 'A',
    train: 'Train A107',
    fare: '1.700 TND',
    isTransfer: false,
  ),
  Journey(
    departure: '18:24',
    arrival: '20:42',
    origin: 'Ezzouhour 2',
    destination: 'Mellassine',
    duration: '2 h 18',
    badge: 'D',
    train: 'A508 + D645',
    fare: '2.400 TND',
    isTransfer: true,
    transfer: 'Tunis Ville · 30 min',
  ),
  Journey(
    departure: '23:30',
    arrival: '00:11',
    origin: 'Tunis Ville',
    destination: 'Erriadh',
    duration: '41 min',
    badge: 'A',
    train: 'Train 259',
    fare: '1.900 TND',
    isTransfer: false,
    overnight: true,
  ),
  Journey(
    departure: '06:40',
    arrival: '07:18',
    origin: 'Tunis Ville',
    destination: 'Bougatfa',
    duration: '38 min',
    badge: 'E',
    train: 'Train E301',
    fare: '1.500 TND',
    isTransfer: false,
  ),
];

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AppShell()),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SncftTheme.navy,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [SncftTheme.navy, SncftTheme.navy2, SncftTheme.blue],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SncftLogo(size: 78, light: true),
              SizedBox(height: 22),
              Text(
                'SNCFT Navigator',
                style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 8),
              Text(
                'Planifiez votre trajet facilement',
                style: TextStyle(color: Colors.white70, fontSize: 15),
              ),
            ],
          ),
        ),
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
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      const SearchScreen(),
      const PlaceholderScreen(title: 'Billets', icon: Icons.confirmation_num_outlined),
      const PlaceholderScreen(title: 'Favoris', icon: Icons.favorite_border),
      const PlaceholderScreen(title: 'Profil', icon: Icons.person_outline),
    ];

    return Scaffold(
      body: screens[index],
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          boxShadow: const [
            BoxShadow(color: Color(0x22000000), blurRadius: 24, offset: Offset(0, 12)),
          ],
        ),
        child: NavigationBar(
          selectedIndex: index,
          height: 72,
          backgroundColor: Colors.transparent,
          indicatorColor: const Color(0xFFE7F1FF),
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Accueil'),
            NavigationDestination(icon: Icon(Icons.confirmation_num_outlined), label: 'Billets'),
            NavigationDestination(icon: Icon(Icons.favorite_border), label: 'Favoris'),
            NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profil'),
          ],
        ),
      ),
    );
  }
}

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final pageController = PageController(viewportFraction: 0.92);
  int slide = 0;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
            child: Row(
              children: [
                const SncftLogo(size: 46),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SNCFT Navigator', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                      Text('Voyagez intelligemment', style: TextStyle(color: SncftTheme.muted)),
                    ],
                  ),
                ),
                IconButton.filledTonal(
                  onPressed: () {},
                  icon: const Icon(Icons.notifications_none_rounded),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 230,
            child: PageView.builder(
              controller: pageController,
              onPageChanged: (value) => setState(() => slide = value),
              itemCount: heroSlides.length,
              itemBuilder: (context, index) => HeroTrainCard(slide: heroSlides[index]),
            ),
          ),
          const SizedBox(height: 10),
          Center(child: SliderDots(active: slide, count: heroSlides.length)),
          Transform.translate(
            offset: const Offset(0, -4),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 20),
              child: SearchCard(),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 110),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Trajets populaires', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
                const SizedBox(height: 12),
                PopularTripTile(
                  line: 'A',
                  title: 'Tunis Ville → Hammam Lif',
                  subtitle: 'Direct · 45 min · dès 1.700 TND',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResultsScreen())),
                ),
                PopularTripTile(
                  line: 'E',
                  title: 'Tunis Ville → Bougatfa',
                  subtitle: 'Direct · 38 min · dès 1.500 TND',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResultsScreen())),
                ),
                PopularTripTile(
                  line: 'D',
                  title: 'Ezzouhour 2 → Mellassine',
                  subtitle: 'Via Tunis Ville · 2 h 18',
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResultsScreen())),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class HeroTrainCard extends StatelessWidget {
  const HeroTrainCard({required this.slide, super.key});
  final HeroSlide slide;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 6),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(color: Color(0x33042A5E), blurRadius: 26, offset: Offset(0, 16)),
        ],
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            slide.asset,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [SncftTheme.navy, SncftTheme.blue, SncftTheme.teal],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Icon(Icons.train_rounded, color: Colors.white24, size: 110),
            ),
          ),
          BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 0.2, sigmaY: 0.2),
            child: Container(color: Colors.black.withOpacity(0.18)),
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0x99000000), Color(0x22000000), Color(0xAA061B35)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
          ),
          Positioned(
            left: 22,
            right: 22,
            bottom: 22,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SncftLogo(size: 42, light: true),
                const SizedBox(height: 12),
                Text(slide.title, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(slide.subtitle, style: const TextStyle(color: Colors.white70, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SearchCard extends StatelessWidget {
  const SearchCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.96),
        borderRadius: BorderRadius.circular(30),
        boxShadow: const [
          BoxShadow(color: Color(0x1F000000), blurRadius: 30, offset: Offset(0, 16)),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            const SearchField(icon: Icons.trip_origin_rounded, label: 'Départ', value: 'Tunis Ville'),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  const Expanded(child: Divider()),
                  Container(
                    height: 42,
                    width: 42,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: [SncftTheme.blue, SncftTheme.teal]),
                    ),
                    child: const Icon(Icons.swap_vert_rounded, color: Colors.white),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),
            ),
            const SearchField(icon: Icons.location_on_outlined, label: 'Destination', value: 'Hammam Lif'),
            const SizedBox(height: 16),
            Row(
              children: const [
                Expanded(child: MiniFilter(icon: Icons.calendar_month_rounded, label: 'Date', value: '25 mai')),
                SizedBox(width: 10),
                Expanded(child: MiniFilter(icon: Icons.schedule_rounded, label: 'Heure', value: 'Maintenant')),
                SizedBox(width: 10),
                Expanded(child: MiniFilter(icon: Icons.groups_rounded, label: 'Personnes', value: '1')),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ResultsScreen())),
                icon: const Icon(Icons.search_rounded),
                label: const Text('Rechercher', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                style: FilledButton.styleFrom(
                  backgroundColor: SncftTheme.blue,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SearchField extends StatelessWidget {
  const SearchField({required this.icon, required this.label, required this.value, super.key});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFFF6F8FC), borderRadius: BorderRadius.circular(20)),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: const Color(0xFFE7F1FF), child: Icon(icon, color: SncftTheme.blue)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(color: SncftTheme.muted, fontSize: 12)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            ]),
          ),
          const Icon(Icons.close_rounded, color: SncftTheme.muted, size: 20),
        ],
      ),
    );
  }
}

class MiniFilter extends StatelessWidget {
  const MiniFilter({required this.icon, required this.label, required this.value, super.key});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(color: const Color(0xFFF6F8FC), borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, color: SncftTheme.teal, size: 20),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(color: SncftTheme.muted, fontSize: 11)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w800)),
      ]),
    );
  }
}

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SncftTheme.soft,
      appBar: AppBar(title: const Text('Résultats')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(24)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Tunis Ville → Hammam Lif', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                const Text('Dim. 25 mai · 1 passager', style: TextStyle(color: SncftTheme.muted)),
                const SizedBox(height: 14),
                Row(
                  children: const [
                    Expanded(child: OutlinePill(label: 'Plus tôt', icon: Icons.keyboard_double_arrow_left_rounded)),
                    SizedBox(width: 8),
                    Expanded(child: FilledPill(label: 'Maintenant', icon: Icons.schedule_rounded)),
                    SizedBox(width: 8),
                    Expanded(child: OutlinePill(label: 'Plus tard', icon: Icons.keyboard_double_arrow_right_rounded)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ...demoJourneys.map((journey) => JourneyCard(journey: journey)),
        ],
      ),
    );
  }
}

class JourneyCard extends StatelessWidget {
  const JourneyCard({required this.journey, super.key});
  final Journey journey;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(26),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 20, offset: Offset(0, 10))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              TimeBlock(time: journey.departure, station: journey.origin),
              Expanded(
                child: Column(
                  children: [
                    BadgePill(text: journey.isTransfer ? '1 correspondance' : 'Direct', color: journey.isTransfer ? SncftTheme.blue : SncftTheme.teal),
                    const SizedBox(height: 8),
                    Row(children: const [
                      CircleAvatar(radius: 4, backgroundColor: SncftTheme.blue),
                      Expanded(child: Divider(thickness: 2)),
                      CircleAvatar(radius: 4, backgroundColor: SncftTheme.teal),
                    ]),
                    const SizedBox(height: 6),
                    Text(journey.duration, style: const TextStyle(fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              TimeBlock(time: journey.arrival, station: journey.destination, plusOne: journey.overnight),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              LineBadge(text: journey.badge),
              const SizedBox(width: 8),
              Expanded(child: Text(journey.train, style: const TextStyle(fontWeight: FontWeight.w800))),
              Text(journey.fare, style: const TextStyle(fontWeight: FontWeight.w900, color: SncftTheme.blue)),
            ],
          ),
          if (journey.transfer != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: const Color(0xFFEFF7FF), borderRadius: BorderRadius.circular(16)),
              child: Row(children: [
                const Icon(Icons.sync_alt_rounded, color: SncftTheme.blue),
                const SizedBox(width: 8),
                Text(journey.transfer!, style: const TextStyle(fontWeight: FontWeight.w700)),
              ]),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => JourneyDetailsScreen(journey: journey))),
              style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))),
              child: const Text('Voir les détails'),
            ),
          ),
        ],
      ),
    );
  }
}

class JourneyDetailsScreen extends StatelessWidget {
  const JourneyDetailsScreen({required this.journey, super.key});
  final Journey journey;

  @override
  Widget build(BuildContext context) {
    final stops = [
      ('08:15', 'Tunis Ville'),
      ('08:21', 'Jebel Jelloud'),
      ('08:31', 'Rades'),
      ('08:38', 'Ezzahra'),
      ('08:44', 'Hammam Lif'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Détails du trajet')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [SncftTheme.navy, SncftTheme.blue]),
              borderRadius: BorderRadius.circular(28),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${journey.origin} → ${journey.destination}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900)),
              const SizedBox(height: 8),
              Text('${journey.duration} · ${journey.fare}', style: const TextStyle(color: Colors.white70)),
              if (journey.overnight) ...[
                const SizedBox(height: 10),
                const BadgePill(text: 'Arrivée le jour suivant', color: SncftTheme.teal),
              ],
            ]),
          ),
          const SizedBox(height: 18),
          const Text('Arrêts et horaires', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          ...stops.map((stop) => TimelineStop(time: stop.$1, name: stop.$2)),
        ],
      ),
    );
  }
}

class TimelineStop extends StatelessWidget {
  const TimelineStop({required this.time, required this.name, super.key});
  final String time;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 56, child: Text(time, style: const TextStyle(fontWeight: FontWeight.w900))),
        Column(children: [
          Container(width: 14, height: 14, decoration: const BoxDecoration(color: SncftTheme.blue, shape: BoxShape.circle)),
          Container(width: 2, height: 42, color: const Color(0xFFD6E2F0)),
        ]),
        const SizedBox(width: 14),
        Expanded(
          child: Container(
            margin: const EdgeInsets.only(bottom: 14),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
            child: Text(name, style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
        ),
      ],
    );
  }
}

class PopularTripTile extends StatelessWidget {
  const PopularTripTile({required this.line, required this.title, required this.subtitle, required this.onTap, super.key});
  final String line;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
      child: ListTile(
        onTap: onTap,
        leading: LineBadge(text: line),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
      ),
    );
  }
}

class SncftLogo extends StatelessWidget {
  const SncftLogo({this.size = 42, this.light = false, super.key});
  final double size;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final color = light ? Colors.white : SncftTheme.blue;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.train_rounded, color: color, size: size * 0.72),
        Text('SNCFT', style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: size * 0.26)),
      ],
    );
  }
}

class SliderDots extends StatelessWidget {
  const SliderDots({required this.active, required this.count, super.key});
  final int active;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(count, (index) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          width: index == active ? 24 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          decoration: BoxDecoration(
            color: index == active ? SncftTheme.blue : const Color(0xFFD3DEEA),
            borderRadius: BorderRadius.circular(99),
          ),
        );
      }),
    );
  }
}

class LineBadge extends StatelessWidget {
  const LineBadge({required this.text, super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [SncftTheme.blue, SncftTheme.teal]),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
    );
  }
}

class BadgePill extends StatelessWidget {
  const BadgePill({required this.text, required this.color, super.key});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(99)),
      child: Text(text, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 12)),
    );
  }
}

class TimeBlock extends StatelessWidget {
  const TimeBlock({required this.time, required this.station, this.plusOne = false, super.key});
  final String time;
  final String station;
  final bool plusOne;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 78,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Text(time, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w900)),
            if (plusOne) const Text(' +1', style: TextStyle(color: SncftTheme.blue, fontWeight: FontWeight.w900)),
          ]),
          Text(station, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: SncftTheme.muted, fontSize: 12)),
        ],
      ),
    );
  }
}

class OutlinePill extends StatelessWidget {
  const OutlinePill({required this.label, required this.icon, super.key});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(onPressed: () {}, icon: Icon(icon, size: 17), label: Text(label));
  }
}

class FilledPill extends StatelessWidget {
  const FilledPill({required this.label, required this.icon, super.key});
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(onPressed: () {}, icon: Icon(icon, size: 17), label: Text(label));
  }
}

class PlaceholderScreen extends StatelessWidget {
  const PlaceholderScreen({required this.title, required this.icon, super.key});
  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 70, color: SncftTheme.blue),
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        const Text('Module à connecter dans la prochaine étape', style: TextStyle(color: SncftTheme.muted)),
      ]),
    );
  }
}
