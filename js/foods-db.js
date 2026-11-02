/**
 * NutriTrack — Database Alimentare Italiano Offline (valori medi per 100g)
 * Fonti di riferimento: Tabelle CREA / BDA-IEO / Valori medi etichette italiane.
 */

window.FOOD_CATEGORIES = [
  { id: 'all', label: 'Tutti', icon: '🍽️' },
  { id: 'colazione', label: 'Colazione & Dolci', icon: '🥐' },
  { id: 'cereali', label: 'Pasta, Pane & Cereali', icon: '🍝' },
  { id: 'carne_pesce', label: 'Carne & Pesce', icon: '🍗' },
  { id: 'latticini_uova', label: 'Latticini & Uova', icon: '🧀' },
  { id: 'legumi', label: 'Legumi & Veg', icon: '🫘' },
  { id: 'verdura', label: 'Verdura & Contorni', icon: '🥦' },
  { id: 'frutta', label: 'Frutta & Frutta Secca', icon: '🍎' },
  { id: 'condimenti', label: 'Condimenti, Snack & Bevande', icon: '🫒' }
];

window.BUILTIN_FOODS = [
  // ===================== COLAZIONE & DOLCI =====================
  {
    id: 'it_latte_ps',
    name: 'Latte parzialmente scremato',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 tazza (200 ml)',
    servingGrams: 200,
    kcal: 46, protein: 3.3, carbs: 4.9, sugars: 4.9, fat: 1.5, saturatedFat: 1.0, fiber: 0, sodium: 44
  },
  {
    id: 'it_latte_intero',
    name: 'Latte intero',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 tazza (200 ml)',
    servingGrams: 200,
    kcal: 64, protein: 3.3, carbs: 4.9, sugars: 4.9, fat: 3.6, saturatedFat: 2.3, fiber: 0, sodium: 43
  },
  {
    id: 'it_bevanda_avena',
    name: 'Bevanda d\'avena senza zuccheri aggiunti',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 tazza (200 ml)',
    servingGrams: 200,
    kcal: 44, protein: 0.8, carbs: 6.8, sugars: 3.5, fat: 1.5, saturatedFat: 0.2, fiber: 0.8, sodium: 40
  },
  {
    id: 'it_bevanda_soia',
    name: 'Bevanda di soia',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 tazza (200 ml)',
    servingGrams: 200,
    kcal: 39, protein: 3.3, carbs: 1.8, sugars: 1.5, fat: 1.9, saturatedFat: 0.3, fiber: 0.6, sodium: 38
  },
  {
    id: 'it_yogurt_greco_0',
    name: 'Yogurt greco 0% grassi',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 vasetto (150 g)',
    servingGrams: 150,
    kcal: 57, protein: 10.3, carbs: 4.0, sugars: 4.0, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 36
  },
  {
    id: 'it_yogurt_greco_5',
    name: 'Yogurt greco 5% grassi',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 vasetto (150 g)',
    servingGrams: 150,
    kcal: 93, protein: 9.0, carbs: 3.0, sugars: 3.0, fat: 5.0, saturatedFat: 3.6, fiber: 0, sodium: 35
  },
  {
    id: 'it_skyr',
    name: 'Skyr bianco naturale',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 vasetto (150 g)',
    servingGrams: 150,
    kcal: 63, protein: 11.0, carbs: 4.0, sugars: 4.0, fat: 0.2, saturatedFat: 0.1, fiber: 0, sodium: 40
  },
  {
    id: 'it_yogurt_intero',
    name: 'Yogurt bianco intero',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 vasetto (125 g)',
    servingGrams: 125,
    kcal: 66, protein: 3.8, carbs: 4.3, sugars: 4.3, fat: 3.9, saturatedFat: 2.5, fiber: 0, sodium: 46
  },
  {
    id: 'it_fiocchi_avena',
    name: 'Fiocchi d\'avena',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 porzione (50 g)',
    servingGrams: 50,
    kcal: 372, protein: 13.5, carbs: 58.7, sugars: 0.7, fat: 7.0, saturatedFat: 1.3, fiber: 10.0, sodium: 7
  },
  {
    id: 'it_fette_biscottate',
    name: 'Fette biscottate classiche',
    brand: 'Generico',
    category: 'colazione',
    servingName: '3 fette (25 g)',
    servingGrams: 25,
    kcal: 408, protein: 11.3, carbs: 74.5, sugars: 6.5, fat: 6.0, saturatedFat: 1.2, fiber: 4.2, sodium: 450
  },
  {
    id: 'it_fette_biscottate_int',
    name: 'Fette biscottate integrali',
    brand: 'Generico',
    category: 'colazione',
    servingName: '3 fette (25 g)',
    servingGrams: 25,
    kcal: 389, protein: 12.5, carbs: 66.0, sugars: 5.5, fat: 6.2, saturatedFat: 1.0, fiber: 9.5, sodium: 430
  },
  {
    id: 'it_biscotti_secchi',
    name: 'Biscotti frollini classici',
    brand: 'Generico',
    category: 'colazione',
    servingName: '4 biscotti (32 g)',
    servingGrams: 32,
    kcal: 458, protein: 7.2, carbs: 70.5, sugars: 21.0, fat: 15.5, saturatedFat: 5.2, fiber: 2.8, sodium: 280
  },
  {
    id: 'it_cornetto_vuoto',
    name: 'Cornetto / Brioche vuota da bar',
    brand: 'Bar',
    category: 'colazione',
    servingName: '1 cornetto (65 g)',
    servingGrams: 65,
    kcal: 411, protein: 7.6, carbs: 51.4, sugars: 14.2, fat: 19.2, saturatedFat: 10.5, fiber: 2.1, sodium: 320
  },
  {
    id: 'it_cornetto_crema',
    name: 'Cornetto alla crema pasticcera',
    brand: 'Bar',
    category: 'colazione',
    servingName: '1 cornetto (85 g)',
    servingGrams: 85,
    kcal: 385, protein: 7.2, carbs: 52.0, sugars: 19.5, fat: 16.5, saturatedFat: 9.0, fiber: 1.8, sodium: 290
  },
  {
    id: 'it_cappuccino',
    name: 'Cappuccino (senza zucchero)',
    brand: 'Bar',
    category: 'colazione',
    servingName: '1 tazza (150 ml)',
    servingGrams: 150,
    kcal: 48, protein: 2.8, carbs: 3.9, sugars: 3.9, fat: 2.4, saturatedFat: 1.5, fiber: 0, sodium: 35
  },
  {
    id: 'it_caffe_espresso',
    name: 'Caffè espresso amaro',
    brand: 'Bar',
    category: 'colazione',
    servingName: '1 tazzina (30 ml)',
    servingGrams: 30,
    kcal: 9, protein: 0.4, carbs: 1.6, sugars: 0.0, fat: 0.2, saturatedFat: 0.1, fiber: 0, sodium: 4
  },
  {
    id: 'it_marmellata',
    name: 'Confettura / Marmellata di frutta',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 cucchiaino abbondante (15 g)',
    servingGrams: 15,
    kcal: 222, protein: 0.5, carbs: 54.0, sugars: 49.0, fat: 0.1, saturatedFat: 0.0, fiber: 1.4, sodium: 12
  },
  {
    id: 'it_miele',
    name: 'Miele millefiori',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 cucchiaino (10 g)',
    servingGrams: 10,
    kcal: 304, protein: 0.6, carbs: 80.3, sugars: 80.3, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 11
  },
  {
    id: 'it_crema_nocciole',
    name: 'Crema spalmabile alle nocciole e cacao',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 cucchiaio (15 g)',
    servingGrams: 15,
    kcal: 539, protein: 6.3, carbs: 57.5, sugars: 56.3, fat: 30.9, saturatedFat: 10.6, fiber: 3.4, sodium: 42
  },
  {
    id: 'it_burro_arachidi',
    name: 'Burro d\'arachidi 100%',
    brand: 'Generico',
    category: 'colazione',
    servingName: '1 cucchiaio (15 g)',
    servingGrams: 15,
    kcal: 598, protein: 26.5, carbs: 13.0, sugars: 4.5, fat: 49.5, saturatedFat: 6.8, fiber: 8.5, sodium: 15
  },
  {
    id: 'it_cioccolato_fondente_85',
    name: 'Cioccolato fondente 85%',
    brand: 'Generico',
    category: 'colazione',
    servingName: '2 quadratini (20 g)',
    servingGrams: 20,
    kcal: 584, protein: 11.0, carbs: 19.0, sugars: 14.0, fat: 48.0, saturatedFat: 29.0, fiber: 13.0, sodium: 10
  },
  {
    id: 'it_gelato_artigianale_creme',
    name: 'Gelato artigianale alle creme',
    brand: 'Gelateria',
    category: 'colazione',
    servingName: '1 coppetta media (120 g)',
    servingGrams: 120,
    kcal: 218, protein: 4.2, carbs: 26.5, sugars: 23.0, fat: 10.5, saturatedFat: 6.5, fiber: 0.5, sodium: 65
  },
  {
    id: 'it_tiramisu',
    name: 'Tiramisù tradizionale',
    brand: 'Ricetta Italiana',
    category: 'colazione',
    servingName: '1 fetta (130 g)',
    servingGrams: 130,
    kcal: 305, protein: 6.5, carbs: 28.0, sugars: 19.5, fat: 18.5, saturatedFat: 10.8, fiber: 0.6, sodium: 95
  },

  // ===================== PASTA, PANE & CEREALI =====================
  {
    id: 'it_pasta_semola_cruda',
    name: 'Pasta di semola (peso a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 piatto (80 g)',
    servingGrams: 80,
    kcal: 353, protein: 12.5, carbs: 71.2, sugars: 3.2, fat: 1.5, saturatedFat: 0.3, fiber: 3.0, sodium: 3
  },
  {
    id: 'it_pasta_integrale_cruda',
    name: 'Pasta integrale (peso a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 piatto (80 g)',
    servingGrams: 80,
    kcal: 342, protein: 13.4, carbs: 65.0, sugars: 3.0, fat: 2.5, saturatedFat: 0.5, fiber: 7.5, sodium: 4
  },
  {
    id: 'it_pasta_cotta',
    name: 'Pasta di semola cotta (scondita)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 piatto cotto (180 g)',
    servingGrams: 180,
    kcal: 158, protein: 5.8, carbs: 30.9, sugars: 0.6, fat: 0.9, saturatedFat: 0.2, fiber: 1.8, sodium: 2
  },
  {
    id: 'it_pasta_pomodoro',
    name: 'Pasta al pomodoro e basilico',
    brand: 'Ricetta Italiana',
    category: 'cereali',
    servingName: '1 piatto (250 g)',
    servingGrams: 250,
    kcal: 156, protein: 5.0, carbs: 25.5, sugars: 2.8, fat: 3.8, saturatedFat: 0.6, fiber: 2.1, sodium: 240
  },
  {
    id: 'it_pasta_carbonara',
    name: 'Pasta alla carbonara',
    brand: 'Ricetta Italiana',
    category: 'cereali',
    servingName: '1 piatto (230 g)',
    servingGrams: 230,
    kcal: 245, protein: 11.2, carbs: 24.5, sugars: 1.0, fat: 11.5, saturatedFat: 4.8, fiber: 1.2, sodium: 480
  },
  {
    id: 'it_pasta_ragu',
    name: 'Pasta al ragù bolognese',
    brand: 'Ricetta Italiana',
    category: 'cereali',
    servingName: '1 piatto (260 g)',
    servingGrams: 260,
    kcal: 182, protein: 8.6, carbs: 23.0, sugars: 2.2, fat: 6.2, saturatedFat: 2.1, fiber: 1.8, sodium: 320
  },
  {
    id: 'it_lasagne_bolognese',
    name: 'Lasagne alla bolognese',
    brand: 'Ricetta Italiana',
    category: 'cereali',
    servingName: '1 porzione (280 g)',
    servingGrams: 280,
    kcal: 175, protein: 9.5, carbs: 15.2, sugars: 3.1, fat: 8.4, saturatedFat: 4.3, fiber: 1.2, sodium: 430
  },
  {
    id: 'it_gnocchi_patate',
    name: 'Gnocchi di patate (crudi)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 156, protein: 4.2, carbs: 33.5, sugars: 0.5, fat: 0.4, saturatedFat: 0.1, fiber: 1.6, sodium: 380
  },
  {
    id: 'it_riso_basmati_crudo',
    name: 'Riso Basmati (peso a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 porzione (80 g)',
    servingGrams: 80,
    kcal: 350, protein: 8.5, carbs: 77.0, sugars: 0.3, fat: 0.8, saturatedFat: 0.2, fiber: 1.4, sodium: 4
  },
  {
    id: 'it_riso_integrale_crudo',
    name: 'Riso integrale (peso a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 porzione (80 g)',
    servingGrams: 80,
    kcal: 348, protein: 7.5, carbs: 73.5, sugars: 0.8, fat: 2.4, saturatedFat: 0.5, fiber: 3.8, sodium: 5
  },
  {
    id: 'it_farro_perlato',
    name: 'Farro perlato (peso a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 porzione (80 g)',
    servingGrams: 80,
    kcal: 335, protein: 14.5, carbs: 67.1, sugars: 2.5, fat: 2.5, saturatedFat: 0.4, fiber: 6.8, sodium: 8
  },
  {
    id: 'it_couscous_crudo',
    name: 'Couscous di grano duro (a crudo)',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 porzione (70 g)',
    servingGrams: 70,
    kcal: 356, protein: 12.8, carbs: 72.0, sugars: 2.0, fat: 1.5, saturatedFat: 0.3, fiber: 3.5, sodium: 10
  },
  {
    id: 'it_pane_comune',
    name: 'Pane bianco comune',
    brand: 'Panificio',
    category: 'cereali',
    servingName: '1 fetta grande / panino piccolo (50 g)',
    servingGrams: 50,
    kcal: 275, protein: 8.6, carbs: 56.5, sugars: 2.0, fat: 1.2, saturatedFat: 0.3, fiber: 3.2, sodium: 550
  },
  {
    id: 'it_pane_integrale',
    name: 'Pane integrale',
    brand: 'Panificio',
    category: 'cereali',
    servingName: '1 fetta grande (50 g)',
    servingGrams: 50,
    kcal: 243, protein: 8.5, carbs: 45.5, sugars: 2.2, fat: 1.8, saturatedFat: 0.4, fiber: 6.8, sodium: 490
  },
  {
    id: 'it_pane_bauletto',
    name: 'Pan bauletto / Pane in cassetta',
    brand: 'Generico',
    category: 'cereali',
    servingName: '2 fette (48 g)',
    servingGrams: 48,
    kcal: 272, protein: 8.8, carbs: 46.5, sugars: 5.5, fat: 4.5, saturatedFat: 0.6, fiber: 4.5, sodium: 480
  },
  {
    id: 'it_piadina',
    name: 'Piadina sfogliata classica',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 piadina (100 g)',
    servingGrams: 100,
    kcal: 325, protein: 7.8, carbs: 49.5, sugars: 1.8, fat: 10.2, saturatedFat: 2.8, fiber: 2.2, sodium: 680
  },
  {
    id: 'it_gallette_riso',
    name: 'Gallette di riso integrale',
    brand: 'Generico',
    category: 'cereali',
    servingName: '3 gallette (24 g)',
    servingGrams: 24,
    kcal: 382, protein: 8.0, carbs: 80.5, sugars: 0.8, fat: 2.8, saturatedFat: 0.6, fiber: 3.5, sodium: 120
  },
  {
    id: 'it_crackers',
    name: 'Crackers salati',
    brand: 'Generico',
    category: 'cereali',
    servingName: '1 pacchetto (31 g)',
    servingGrams: 31,
    kcal: 428, protein: 10.2, carbs: 69.5, sugars: 2.2, fat: 11.5, saturatedFat: 1.4, fiber: 3.6, sodium: 720
  },
  {
    id: 'it_pizza_margherita',
    name: 'Pizza Margherita da pizzeria',
    brand: 'Pizzeria',
    category: 'cereali',
    servingName: '1 pizza intera (300 g)',
    servingGrams: 300,
    kcal: 266, protein: 11.0, carbs: 33.0, sugars: 3.5, fat: 9.8, saturatedFat: 4.4, fiber: 2.3, sodium: 590
  },
  {
    id: 'it_pizza_diavola',
    name: 'Pizza Diavola (salame piccante)',
    brand: 'Pizzeria',
    category: 'cereali',
    servingName: '1 pizza intera (320 g)',
    servingGrams: 320,
    kcal: 292, protein: 12.6, carbs: 31.2, sugars: 3.2, fat: 12.8, saturatedFat: 5.6, fiber: 2.1, sodium: 690
  },
  {
    id: 'it_focaccia_genovese',
    name: 'Focaccia bianca all\'olio',
    brand: 'Panificio',
    category: 'cereali',
    servingName: '1 trancio (100 g)',
    servingGrams: 100,
    kcal: 318, protein: 7.8, carbs: 47.0, sugars: 2.1, fat: 10.8, saturatedFat: 1.6, fiber: 2.4, sodium: 640
  },

  // ===================== CARNE & PESCE =====================
  {
    id: 'it_petto_pollo_crudo',
    name: 'Petto di pollo (peso a crudo)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 110, protein: 23.3, carbs: 0.0, sugars: 0.0, fat: 1.2, saturatedFat: 0.3, fiber: 0, sodium: 60
  },
  {
    id: 'it_petto_pollo_piastra',
    name: 'Petto di pollo alla piastra (cotto)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (140 g)',
    servingGrams: 140,
    kcal: 165, protein: 31.0, carbs: 0.0, sugars: 0.0, fat: 3.6, saturatedFat: 1.0, fiber: 0, sodium: 74
  },
  {
    id: 'it_fesa_tacchino_cruda',
    name: 'Fesa di tacchino (peso a crudo)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 107, protein: 24.0, carbs: 0.0, sugars: 0.0, fat: 1.2, saturatedFat: 0.3, fiber: 0, sodium: 52
  },
  {
    id: 'it_fesa_tacchino_affettato',
    name: 'Fesa di tacchino arrosto (affettato)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (80 g)',
    servingGrams: 80,
    kcal: 104, protein: 21.5, carbs: 1.2, sugars: 0.8, fat: 1.5, saturatedFat: 0.5, fiber: 0, sodium: 780
  },
  {
    id: 'it_macinato_bovino_magro',
    name: 'Carne macinata magra di bovino',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 hamburger / porzione (150 g)',
    servingGrams: 150,
    kcal: 137, protein: 21.4, carbs: 0.0, sugars: 0.0, fat: 5.5, saturatedFat: 2.3, fiber: 0, sodium: 65
  },
  {
    id: 'it_bistecca_manzo',
    name: 'Bistecca / Tagliata di manzo magra',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 bistecca (180 g)',
    servingGrams: 180,
    kcal: 142, protein: 21.8, carbs: 0.0, sugars: 0.0, fat: 6.0, saturatedFat: 2.5, fiber: 0, sodium: 58
  },
  {
    id: 'it_lonza_maiale',
    name: 'Lonza / Arista di maiale',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 146, protein: 21.5, carbs: 0.0, sugars: 0.0, fat: 6.6, saturatedFat: 2.4, fiber: 0, sodium: 62
  },
  {
    id: 'it_bresaola',
    name: 'Bresaola della Valtellina',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (70 g)',
    servingGrams: 70,
    kcal: 151, protein: 32.0, carbs: 0.0, sugars: 0.0, fat: 2.6, saturatedFat: 0.9, fiber: 0, sodium: 1590
  },
  {
    id: 'it_prosciutto_crudo',
    name: 'Prosciutto crudo di Parma / San Daniele',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (60 g)',
    servingGrams: 60,
    kcal: 268, protein: 26.9, carbs: 0.0, sugars: 0.0, fat: 17.8, saturatedFat: 6.1, fiber: 0, sodium: 1760
  },
  {
    id: 'it_prosciutto_cotto',
    name: 'Prosciutto cotto alta qualità',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (70 g)',
    servingGrams: 70,
    kcal: 145, protein: 19.8, carbs: 1.0, sugars: 0.8, fat: 6.8, saturatedFat: 2.4, fiber: 0, sodium: 780
  },
  {
    id: 'it_salmone_fresco',
    name: 'Salmone fresco (filetto)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 trancio (150 g)',
    servingGrams: 150,
    kcal: 208, protein: 20.4, carbs: 0.0, sugars: 0.0, fat: 13.4, saturatedFat: 3.1, fiber: 0, sodium: 50
  },
  {
    id: 'it_salmone_affumicato',
    name: 'Salmone norvegese affumicato',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 bustina / porzione (80 g)',
    servingGrams: 80,
    kcal: 185, protein: 22.0, carbs: 0.5, sugars: 0.5, fat: 10.5, saturatedFat: 2.2, fiber: 0, sodium: 1200
  },
  {
    id: 'it_tonno_naturale',
    name: 'Tonno al naturale sgocciolato',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 scatoletta sgocciolata (56 g)',
    servingGrams: 56,
    kcal: 103, protein: 24.5, carbs: 0.0, sugars: 0.0, fat: 0.6, saturatedFat: 0.2, fiber: 0, sodium: 380
  },
  {
    id: 'it_tonno_olio',
    name: 'Tonno all\'olio d\'oliva sgocciolato',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 scatoletta sgocciolata (52 g)',
    servingGrams: 52,
    kcal: 192, protein: 25.2, carbs: 0.0, sugars: 0.0, fat: 10.1, saturatedFat: 1.6, fiber: 0, sodium: 390
  },
  {
    id: 'it_merluzzo',
    name: 'Merluzzo / Nasello (filetto)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (180 g)',
    servingGrams: 180,
    kcal: 82, protein: 17.8, carbs: 0.0, sugars: 0.0, fat: 0.7, saturatedFat: 0.1, fiber: 0, sodium: 72
  },
  {
    id: 'it_orata_spigola',
    name: 'Orata / Branzino (filetto)',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 filetto (160 g)',
    servingGrams: 160,
    kcal: 121, protein: 20.0, carbs: 0.0, sugars: 0.0, fat: 4.4, saturatedFat: 1.1, fiber: 0, sodium: 75
  },
  {
    id: 'it_gamberi',
    name: 'Gamberi / Mazzancolle sgusciati',
    brand: 'Generico',
    category: 'carne_pesce',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 85, protein: 18.5, carbs: 1.0, sugars: 0.0, fat: 0.9, saturatedFat: 0.2, fiber: 0, sodium: 180
  },

  // ===================== LATTICINI & UOVA =====================
  {
    id: 'it_uovo_intero',
    name: 'Uovo di gallina intero',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 uovo medio (60 g)',
    servingGrams: 60,
    kcal: 143, protein: 12.6, carbs: 0.7, sugars: 0.4, fat: 9.5, saturatedFat: 3.1, fiber: 0, sodium: 142
  },
  {
    id: 'it_albume_uovo',
    name: 'Albume d\'uovo pastorizzato',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 bicchiere (150 g)',
    servingGrams: 150,
    kcal: 48, protein: 10.9, carbs: 0.7, sugars: 0.7, fat: 0.1, saturatedFat: 0.0, fiber: 0, sodium: 166
  },
  {
    id: 'it_parmigiano',
    name: 'Parmigiano Reggiano DOP / Grana Padano',
    brand: 'DOP',
    category: 'latticini_uova',
    servingName: '1 porzione / 2 cucchiai (20 g)',
    servingGrams: 20,
    kcal: 402, protein: 32.4, carbs: 0.0, sugars: 0.0, fat: 29.7, saturatedFat: 19.6, fiber: 0, sodium: 650
  },
  {
    id: 'it_mozzarella',
    name: 'Mozzarella vaccina fior di latte',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 mozzarella (125 g)',
    servingGrams: 125,
    kcal: 253, protein: 18.7, carbs: 0.7, sugars: 0.7, fat: 19.5, saturatedFat: 12.0, fiber: 0, sodium: 200
  },
  {
    id: 'it_mozzarella_light',
    name: 'Mozzarella light',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 mozzarella (125 g)',
    servingGrams: 125,
    kcal: 163, protein: 20.5, carbs: 1.2, sugars: 1.2, fat: 8.5, saturatedFat: 5.6, fiber: 0, sodium: 220
  },
  {
    id: 'it_mozzarella_bufala',
    name: 'Mozzarella di Bufala Campana DOP',
    brand: 'DOP',
    category: 'latticini_uova',
    servingName: '1 porzione (125 g)',
    servingGrams: 125,
    kcal: 288, protein: 16.7, carbs: 0.4, sugars: 0.4, fat: 24.4, saturatedFat: 16.0, fiber: 0, sodium: 230
  },
  {
    id: 'it_ricotta_vaccina',
    name: 'Ricotta vaccina fresca',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 porzione (100 g)',
    servingGrams: 100,
    kcal: 146, protein: 8.8, carbs: 3.5, sugars: 3.5, fat: 10.9, saturatedFat: 7.0, fiber: 0, sodium: 78
  },
  {
    id: 'it_fiocchi_latte',
    name: 'Fiocchi di latte (Cottage cheese)',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 vasetto (150 g)',
    servingGrams: 150,
    kcal: 98, protein: 12.5, carbs: 2.6, sugars: 2.6, fat: 4.3, saturatedFat: 2.8, fiber: 0, sodium: 320
  },
  {
    id: 'it_stracchino',
    name: 'Stracchino / Crescenza',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 porzione (80 g)',
    servingGrams: 80,
    kcal: 300, protein: 18.5, carbs: 0.5, sugars: 0.5, fat: 25.1, saturatedFat: 16.8, fiber: 0, sodium: 390
  },
  {
    id: 'it_formaggio_spalmabile_light',
    name: 'Formaggio fresco spalmabile light',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 porzione (50 g)',
    servingGrams: 50,
    kcal: 152, protein: 8.5, carbs: 4.2, sugars: 4.2, fat: 11.2, saturatedFat: 7.5, fiber: 0, sodium: 310
  },
  {
    id: 'it_feta',
    name: 'Feta greca DOP',
    brand: 'Generico',
    category: 'latticini_uova',
    servingName: '1 porzione (60 g)',
    servingGrams: 60,
    kcal: 264, protein: 14.2, carbs: 1.5, sugars: 1.5, fat: 22.0, saturatedFat: 15.2, fiber: 0, sodium: 920
  },

  // ===================== LEGUMI & VEG =====================
  {
    id: 'it_ceci_cotti',
    name: 'Ceci cotti / in scatola sgocciolati',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 128, protein: 7.0, carbs: 18.5, sugars: 1.0, fat: 2.4, saturatedFat: 0.3, fiber: 5.8, sodium: 240
  },
  {
    id: 'it_lenticchie_cotte',
    name: 'Lenticchie cotte / sgocciolate',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 112, protein: 8.2, carbs: 16.5, sugars: 0.8, fat: 0.6, saturatedFat: 0.1, fiber: 5.5, sodium: 210
  },
  {
    id: 'it_fagioli_borlotti_cotti',
    name: 'Fagioli borlotti / cannellini cotti',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 108, protein: 7.4, carbs: 15.8, sugars: 0.9, fat: 0.7, saturatedFat: 0.1, fiber: 6.5, sodium: 230
  },
  {
    id: 'it_piselli_cotti',
    name: 'Piselli fini (surgelati / cotti)',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 81, protein: 5.5, carbs: 11.2, sugars: 4.5, fat: 0.6, saturatedFat: 0.1, fiber: 5.1, sodium: 5
  },
  {
    id: 'it_edamame',
    name: 'Edamame sgusciati',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 porzione (100 g)',
    servingGrams: 100,
    kcal: 122, protein: 11.9, carbs: 8.9, sugars: 2.2, fat: 5.2, saturatedFat: 0.6, fiber: 5.2, sodium: 6
  },
  {
    id: 'it_tofu',
    name: 'Tofu al naturale',
    brand: 'Generico',
    category: 'legumi',
    servingName: '1 panetto (125 g)',
    servingGrams: 125,
    kcal: 118, protein: 13.5, carbs: 1.5, sugars: 0.5, fat: 6.5, saturatedFat: 1.0, fiber: 1.2, sodium: 14
  },
  {
    id: 'it_hummus',
    name: 'Hummus di ceci',
    brand: 'Generico',
    category: 'legumi',
    servingName: '2 cucchiai (50 g)',
    servingGrams: 50,
    kcal: 245, protein: 7.5, carbs: 14.0, sugars: 1.2, fat: 17.0, saturatedFat: 2.3, fiber: 5.5, sodium: 380
  },

  // ===================== VERDURA & CONTORNI =====================
  {
    id: 'it_insalata_mista',
    name: 'Insalata verde / mista (scondita)',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 ciotola (80 g)',
    servingGrams: 80,
    kcal: 18, protein: 1.4, carbs: 2.2, sugars: 1.2, fat: 0.3, saturatedFat: 0.0, fiber: 1.8, sodium: 18
  },
  {
    id: 'it_pomodori',
    name: 'Pomodori freschi (ciliegino / insalata)',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 19, protein: 1.0, carbs: 3.5, sugars: 3.0, fat: 0.2, saturatedFat: 0.0, fiber: 1.2, sodium: 5
  },
  {
    id: 'it_passata_pomodoro',
    name: 'Passata di pomodoro semplice',
    brand: 'Generico',
    category: 'verdura',
    servingName: '1 porzione per pasta (100 g)',
    servingGrams: 100,
    kcal: 28, protein: 1.4, carbs: 4.8, sugars: 4.2, fat: 0.2, saturatedFat: 0.0, fiber: 1.3, sodium: 150
  },
  {
    id: 'it_zucchine',
    name: 'Zucchine fresche',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 17, protein: 1.3, carbs: 2.5, sugars: 2.2, fat: 0.2, saturatedFat: 0.0, fiber: 1.2, sodium: 8
  },
  {
    id: 'it_melanzane',
    name: 'Melanzane (grigliate / crude)',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (180 g)',
    servingGrams: 180,
    kcal: 23, protein: 1.1, carbs: 3.5, sugars: 2.8, fat: 0.2, saturatedFat: 0.0, fiber: 2.6, sodium: 4
  },
  {
    id: 'it_broccoli',
    name: 'Broccoli',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 34, protein: 3.0, carbs: 4.4, sugars: 1.7, fat: 0.4, saturatedFat: 0.1, fiber: 3.1, sodium: 30
  },
  {
    id: 'it_spinaci',
    name: 'Spinaci (freschi o surgelati)',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 25, protein: 3.1, carbs: 2.0, sugars: 0.4, fat: 0.5, saturatedFat: 0.1, fiber: 2.2, sodium: 75
  },
  {
    id: 'it_carote',
    name: 'Carote crude',
    brand: 'Orto',
    category: 'verdura',
    servingName: '2 carote medie (150 g)',
    servingGrams: 150,
    kcal: 38, protein: 1.1, carbs: 7.6, sugars: 6.5, fat: 0.2, saturatedFat: 0.0, fiber: 3.1, sodium: 65
  },
  {
    id: 'it_peperoni',
    name: 'Peperoni rossi / gialli',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 27, protein: 0.9, carbs: 5.3, sugars: 4.2, fat: 0.3, saturatedFat: 0.0, fiber: 1.9, sodium: 3
  },
  {
    id: 'it_fagiolini',
    name: 'Fagiolini verdi lessi',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 24, protein: 2.1, carbs: 3.2, sugars: 1.4, fat: 0.2, saturatedFat: 0.0, fiber: 2.9, sodium: 4
  },
  {
    id: 'it_funghi',
    name: 'Funghi champignon',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (150 g)',
    servingGrams: 150,
    kcal: 22, protein: 3.1, carbs: 1.2, sugars: 0.8, fat: 0.3, saturatedFat: 0.0, fiber: 1.5, sodium: 5
  },
  {
    id: 'it_patate_bollite',
    name: 'Patate (crude / bollite senza condimento)',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione media (200 g)',
    servingGrams: 200,
    kcal: 80, protein: 2.0, carbs: 17.5, sugars: 0.8, fat: 0.1, saturatedFat: 0.0, fiber: 1.8, sodium: 6
  },
  {
    id: 'it_patate_dolci',
    name: 'Patata dolce / Americana',
    brand: 'Orto',
    category: 'verdura',
    servingName: '1 porzione (200 g)',
    servingGrams: 200,
    kcal: 86, protein: 1.6, carbs: 20.1, sugars: 4.2, fat: 0.1, saturatedFat: 0.0, fiber: 3.0, sodium: 55
  },
  {
    id: 'it_patatine_fritte',
    name: 'Patatine fritte',
    brand: 'Generico',
    category: 'verdura',
    servingName: '1 porzione media (120 g)',
    servingGrams: 120,
    kcal: 295, protein: 3.5, carbs: 36.5, sugars: 0.5, fat: 14.5, saturatedFat: 2.2, fiber: 3.2, sodium: 310
  },

  // ===================== FRUTTA & FRUTTA SECCA =====================
  {
    id: 'it_mela',
    name: 'Mela fresca con buccia',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 mela media (180 g)',
    servingGrams: 180,
    kcal: 52, protein: 0.3, carbs: 12.8, sugars: 10.4, fat: 0.2, saturatedFat: 0.0, fiber: 2.4, sodium: 1
  },
  {
    id: 'it_banana',
    name: 'Banana (parte edibile)',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 banana media (120 g)',
    servingGrams: 120,
    kcal: 89, protein: 1.1, carbs: 21.0, sugars: 14.5, fat: 0.3, saturatedFat: 0.1, fiber: 2.6, sodium: 1
  },
  {
    id: 'it_arancia',
    name: 'Arancia fresca',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 arancia media (160 g)',
    servingGrams: 160,
    kcal: 43, protein: 0.8, carbs: 9.2, sugars: 8.5, fat: 0.2, saturatedFat: 0.0, fiber: 2.0, sodium: 2
  },
  {
    id: 'it_pera',
    name: 'Pera fresca',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 pera media (170 g)',
    servingGrams: 170,
    kcal: 55, protein: 0.4, carbs: 13.0, sugars: 9.8, fat: 0.1, saturatedFat: 0.0, fiber: 3.1, sodium: 1
  },
  {
    id: 'it_kiwi',
    name: 'Kiwi verde',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '2 kiwi (150 g)',
    servingGrams: 150,
    kcal: 58, protein: 1.1, carbs: 12.2, sugars: 9.0, fat: 0.5, saturatedFat: 0.0, fiber: 2.8, sodium: 3
  },
  {
    id: 'it_fragole',
    name: 'Fragole fresche',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 coppetta (150 g)',
    servingGrams: 150,
    kcal: 32, protein: 0.7, carbs: 6.5, sugars: 4.9, fat: 0.3, saturatedFat: 0.0, fiber: 2.0, sodium: 1
  },
  {
    id: 'it_mirtilli',
    name: 'Mirtilli neri freschi',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 vaschetta (125 g)',
    servingGrams: 125,
    kcal: 52, protein: 0.7, carbs: 11.8, sugars: 9.5, fat: 0.3, saturatedFat: 0.0, fiber: 2.4, sodium: 1
  },
  {
    id: 'it_pesca',
    name: 'Pesca / Nettarina',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 pesca media (150 g)',
    servingGrams: 150,
    kcal: 39, protein: 0.9, carbs: 8.8, sugars: 8.0, fat: 0.2, saturatedFat: 0.0, fiber: 1.6, sodium: 1
  },
  {
    id: 'it_uva',
    name: 'Uva da tavola',
    brand: 'Frutta',
    category: 'frutta',
    servingName: '1 grappolo piccolo (150 g)',
    servingGrams: 150,
    kcal: 69, protein: 0.7, carbs: 16.8, sugars: 15.5, fat: 0.2, saturatedFat: 0.0, fiber: 1.4, sodium: 2
  },
  {
    id: 'it_avocado',
    name: 'Avocado maturo',
    brand: 'Frutta',
    category: 'frutta',
    servingName: 'Mezzo avocado (70 g)',
    servingGrams: 70,
    kcal: 198, protein: 2.0, carbs: 2.0, sugars: 0.7, fat: 19.5, saturatedFat: 2.8, fiber: 6.7, sodium: 7
  },
  {
    id: 'it_mandorle',
    name: 'Mandorle sgusciate',
    brand: 'Frutta Secca',
    category: 'frutta',
    servingName: '1 manciata / 15 mandorle (20 g)',
    servingGrams: 20,
    kcal: 595, protein: 21.2, carbs: 8.8, sugars: 4.4, fat: 52.5, saturatedFat: 4.0, fiber: 12.2, sodium: 2
  },
  {
    id: 'it_noci',
    name: 'Noci sgusciate (gherigli)',
    brand: 'Frutta Secca',
    category: 'frutta',
    servingName: '4-5 noci (20 g)',
    servingGrams: 20,
    kcal: 668, protein: 15.2, carbs: 6.8, sugars: 2.6, fat: 65.2, saturatedFat: 6.1, fiber: 6.7, sodium: 2
  },
  {
    id: 'it_nocciole',
    name: 'Nocciole tostate',
    brand: 'Frutta Secca',
    category: 'frutta',
    servingName: '1 manciata (20 g)',
    servingGrams: 20,
    kcal: 646, protein: 15.0, carbs: 7.2, sugars: 4.0, fat: 62.4, saturatedFat: 4.5, fiber: 9.4, sodium: 2
  },
  {
    id: 'it_pistacchi',
    name: 'Pistacchi sgusciati',
    brand: 'Frutta Secca',
    category: 'frutta',
    servingName: '1 porzione (25 g)',
    servingGrams: 25,
    kcal: 572, protein: 20.6, carbs: 16.5, sugars: 7.6, fat: 45.8, saturatedFat: 5.6, fiber: 10.3, sodium: 6
  },

  // ===================== CONDIMENTI, SNACK & BEVANDE =====================
  {
    id: 'it_olio_evo',
    name: 'Olio extravergine d\'oliva (EVO)',
    brand: 'Generico',
    category: 'condimenti',
    servingName: '1 cucchiaio (10 g)',
    servingGrams: 10,
    kcal: 899, protein: 0.0, carbs: 0.0, sugars: 0.0, fat: 99.9, saturatedFat: 14.5, fiber: 0, sodium: 0
  },
  {
    id: 'it_burro',
    name: 'Burro tradizionale',
    brand: 'Generico',
    category: 'condimenti',
    servingName: '1 noce di burro (10 g)',
    servingGrams: 10,
    kcal: 758, protein: 0.8, carbs: 1.1, sugars: 1.1, fat: 83.4, saturatedFat: 52.0, fiber: 0, sodium: 15
  },
  {
    id: 'it_pesto_genovese',
    name: 'Pesto alla genovese',
    brand: 'Generico',
    category: 'condimenti',
    servingName: '1 porzione per pasta (45 g)',
    servingGrams: 45,
    kcal: 458, protein: 5.2, carbs: 6.5, sugars: 2.0, fat: 45.5, saturatedFat: 6.8, fiber: 1.8, sodium: 980
  },
  {
    id: 'it_maionese',
    name: 'Maionese classica',
    brand: 'Generico',
    category: 'condimenti',
    servingName: '1 cucchiaio (15 g)',
    servingGrams: 15,
    kcal: 680, protein: 1.1, carbs: 1.8, sugars: 1.2, fat: 74.0, saturatedFat: 8.8, fiber: 0, sodium: 560
  },
  {
    id: 'it_zucchero',
    name: 'Zucchero bianco / di canna',
    brand: 'Generico',
    category: 'condimenti',
    servingName: '1 bustina / cucchiaino (5 g)',
    servingGrams: 5,
    kcal: 392, protein: 0.0, carbs: 99.8, sugars: 99.8, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 0
  },
  {
    id: 'it_proteine_whey',
    name: 'Proteine Whey in polvere',
    brand: 'Integratore',
    category: 'condimenti',
    servingName: '1 misurino (30 g)',
    servingGrams: 30,
    kcal: 382, protein: 78.0, carbs: 6.0, sugars: 4.0, fat: 5.2, saturatedFat: 3.1, fiber: 0.5, sodium: 180
  },
  {
    id: 'it_barretta_proteica',
    name: 'Barretta proteica low sugar',
    brand: 'Integratore',
    category: 'condimenti',
    servingName: '1 barretta (55 g)',
    servingGrams: 55,
    kcal: 365, protein: 36.0, carbs: 30.0, sugars: 3.2, fat: 12.5, saturatedFat: 6.5, fiber: 8.0, sodium: 220
  },
  {
    id: 'it_patatine_sacchetto',
    name: 'Patatine classiche in busta',
    brand: 'Snack',
    category: 'condimenti',
    servingName: '1 porzione (30 g)',
    servingGrams: 30,
    kcal: 536, protein: 6.5, carbs: 51.0, sugars: 0.6, fat: 33.5, saturatedFat: 3.5, fiber: 4.2, sodium: 560
  },
  {
    id: 'it_vino_rosso',
    name: 'Vino rosso / bianco (12.5% vol)',
    brand: 'Bevanda',
    category: 'condimenti',
    servingName: '1 calice (125 ml)',
    servingGrams: 125,
    kcal: 83, protein: 0.1, carbs: 2.4, sugars: 0.6, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 5
  },
  {
    id: 'it_birra_chiara',
    name: 'Birra chiara lager (5% vol)',
    brand: 'Bevanda',
    category: 'condimenti',
    servingName: '1 birra media / lattina (330 ml)',
    servingGrams: 330,
    kcal: 43, protein: 0.5, carbs: 3.5, sugars: 0.2, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 4
  },
  {
    id: 'it_spritz_aperol',
    name: 'Spritz classico da aperitivo',
    brand: 'Bar',
    category: 'condimenti',
    servingName: '1 calice (200 ml)',
    servingGrams: 200,
    kcal: 88, protein: 0.1, carbs: 8.5, sugars: 8.2, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 10
  },
  {
    id: 'it_succo_arancia',
    name: 'Spremuta d\'arancia fresca',
    brand: 'Bevanda',
    category: 'condimenti',
    servingName: '1 bicchiere (200 ml)',
    servingGrams: 200,
    kcal: 45, protein: 0.7, carbs: 10.4, sugars: 8.4, fat: 0.2, saturatedFat: 0.0, fiber: 0.3, sodium: 2
  },
  {
    id: 'it_bibita_zuccherata',
    name: 'Bibita gassata zuccherata (es. Cola / Aranciata)',
    brand: 'Bevanda',
    category: 'condimenti',
    servingName: '1 lattina (330 ml)',
    servingGrams: 330,
    kcal: 42, protein: 0.0, carbs: 10.6, sugars: 10.6, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 4
  },
  {
    id: 'it_bibita_zero',
    name: 'Bibita Zero zuccheri',
    brand: 'Bevanda',
    category: 'condimenti',
    servingName: '1 lattina (330 ml)',
    servingGrams: 330,
    kcal: 0.3, protein: 0.0, carbs: 0.0, sugars: 0.0, fat: 0.0, saturatedFat: 0.0, fiber: 0, sodium: 12
  }
];
