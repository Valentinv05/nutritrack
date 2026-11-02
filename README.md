# 🥗 NutriTrack — Diario Alimentare, Calorie & Macronutrienti (PWA)

**NutriTrack** è una Web App progressiva (PWA) pensata per smartphone (Android e iPhone) e PC per tenere traccia ogni giorno di pasti, calorie, macronutrienti, fibre, zuccheri, sodio, idratazione, attività fisica e peso corporeo.

---

## ✨ Funzionalità incluse

- **Diario Giornaliero Completo**: Colazione, Pranzo, Cena e Spuntini con anello dinamico delle calorie rimanenti, calorie bruciate con lo sport e copia rapida dei pasti da ieri.
- **Macronutrienti & Micronutrienti**: Monitoraggio di **Carboidrati**, **Proteine**, **Grassi**, oltre a **Fibre**, **Zuccheri**, **Grassi saturi** e **Sodio**.
- **Database Italiano Offline (110+ alimenti)**: Valori nutrizionali pronti anche senza internet per pasta, pane, latticini, carni, pesce, legumi, frutta, verdura e piatti comuni italiani, con porzioni standard preimpostate.
- **Ricerca Marche Supermercato & Scanner Codice a Barre**: Integrazione diretta con **Open Food Facts Italia** per cercare prodotti confezionati per nome o tramite **fotocamera / foto al codice a barre EAN**.
- **Alimenti Personalizzati & Calorie Rapide**: Crea le tue ricette/alimenti personali o aggiungi calorie al volo quando mangi fuori.
- **Idratazione & Attività Fisica**: Tracciamento rapido dell'acqua (`+200 ml` / `+500 ml`) e degli allenamenti con calcolo automatico delle calorie bruciate (MET).
- **Statistiche & Peso Corporeo**: Grafici a barre su 7 e 14 giorni, grafico a ciambella della ripartizione macro, calcolo **IMC (BMI)** e grafico dell'andamento del peso.
- **Calcolatore Metabolico (BMR & TDEE)**: Formula scientifica *Mifflin-St Jeor* con preset *Mediterranea Bilanciata*, *Proteica / Fitness*, *Low Carb* e *Chetogenica* (oppure inserimento manuale).
- **Privacy & Backup**: Tutti i dati restano salvati localmente sul dispositivo, con esportazione e importazione JSON in un clic.

---

## 🚀 Come avviare l'app

### 1. Avvio rapido da PC + Telefono (tramite Wi-Fi)
1. Fai doppio clic su **`avvia_nutritrack.bat`** (oppure esegui `python server.py`).
2. Si aprirà l'app sul PC e comparirà un **QR Code** (visibile anche cliccando il pulsante **📱 Telefono** in alto a destra nell'app).
3. Con il telefono collegato alla **stessa rete Wi-Fi** del PC, inquadra il QR Code con la fotocamera per aprirla subito sul telefono!
   *(Nota: se Windows chiede il permesso per Python sul Firewall, consenti l'accesso per le **Reti private**).*

### 2. Installazione come vera App sul Telefono (anche fuori casa e offline)
Se vuoi usare NutriTrack **ovunque, anche fuori casa in 4G/5G o completamente offline** senza tenere acceso il PC:
1. Carica gratuitamente questa cartella `NutriTrack` su **[Netlify Drop](https://app.netlify.com/drop)** (basta trascinare l'intera cartella nella pagina) oppure su **GitHub Pages**.
2. Apri il link HTTPS ottenuto sul tuo telefono:
   - **Su Android (Chrome)**: tocca il menu **⋮** → **"Installa app"** (o *"Aggiungi a schermata Home"*).
   - **Su iPhone (Safari)**: tocca **Condividi (⬆️)** → **"Aggiungi alla schermata Home"**.
3. NutriTrack apparirà tra le tue app con la sua icona dedicata e funzionerà a schermo intero anche senza connessione!
