# PairFX - Quick Start Guide

## 🚀 Snel aan de slag

### Stap 1: Start de applicatie

**Optie A - Met PowerShell script:**
```powershell
cd E:\dev\pairfx-live
.\start.ps1
```

**Optie B - Direct met Python:**
```powershell
cd E:\dev\pairfx-live
python -m http.server 8000
```

**Optie C - VS Code Live Server:**
- Installeer "Live Server" extensie in VS Code
- Rechtsklik op `index.html` → "Open with Live Server"

Open dan: `http://localhost:8000`

---

## 📋 Basis Workflow

### 1️⃣ Maak een nieuw toernooi
1. Klik op **"+ Nieuw Toernooi"**
2. Geef een naam op (bijv. "Jeugdtoernooi December 2025")
3. Je wordt automatisch naar het toernooi scherm gebracht

### 2️⃣ Voeg spelers toe

**Optie A - Handmatig:**
1. Klik op **"+ Speler"**
2. Vul in: Voornaam, Naam, Klas (optioneel)
3. Klik **"Opslaan"**

**Optie B - Import CSV:**
1. Klik op **"📥 Import CSV"**
2. Selecteer `example-players.csv` of je eigen bestand
3. 10 spelers worden direct geïmporteerd!

**CSV Format:**
```csv
Voornaam,Naam,Klas
Jan,Janssen,5A
Marie,Pieters,5B
```

### 3️⃣ Configureer instellingen (optioneel)
1. Klik op **"⚙️ Instellingen"**
2. Pas aan:
   - **Constraint X**: Hoe recent spelers tegen elkaar mogen spelen (standaard: 3 rondes)
   - **Constraint Y**: Max puntenverschil tussen tegenstanders (standaard: 3 punten)
   - **Klas constraint**: Vermijd paringen binnen zelfde klas
   - **Scoring**: Punten of Percentage weergave
3. Klik **"Opslaan"**

### 4️⃣ Maak paringen

**Automatisch (aanbevolen):**
1. Zorg dat spelers beschikbaar zijn (middenkolom)
2. Klik op **"🎲 Maak Paringen"**
3. Het algoritme maakt optimale paringen volgens de constraints

**Selectie:**
1. Klik op spelers in de middenkolom om ze te selecteren
2. Klik **"🎲 Maak Paringen"**
3. Alleen geselecteerde spelers worden gepaard

**Handmatig (2 spelers):**
1. Selecteer **exact 2 spelers** in de middenkolom
2. Klik **"🎲 Maak Paringen"**
3. Deze twee worden direct gepaard (constraints X en Y genegeerd)

### 5️⃣ Voer resultaten in
1. Zie de nieuwe paringen in de rechterkolom (groen gemarkeerd)
2. Klik op het resultaat:
   - **"1-0"** = Wit wint
   - **"½-½"** = Remise
   - **"0-1"** = Zwart wint
3. Klassement wordt automatisch bijgewerkt in linkerkolom

### 6️⃣ Herhaal
1. Afgeronde paringen verdwijnen uit de "actieve" lijst
2. Spelers worden weer beschikbaar
3. Maak nieuwe paringen voor volgende ronde
4. Het toernooi groeit organisch!

---

## 🎯 Handige Features

### Speler Afwezig Markeren
- Klik op **"✗ Afwezig"** bij een speler
- Ze worden uitgesloten van nieuwe paringen
- Klik **"✓ Aanwezig"** om ze weer beschikbaar te maken

### Partijgeschiedenis Bekijken
- Klik op **"📜 Geschiedenis"** bij een speler
- Zie alle gespeelde partijen met:
  - Tegenstander
  - Kleur (wit/zwart)
  - Resultaat
  - Datum/tijd

### Laatste Paringen Ongedaan Maken
- Klik op **"↶ Ongedaan"** (rechterkolom)
- De laatste batch nieuwe paringen wordt verwijderd
- Handig bij fouten!

### Filteren
- **Beschikbare spelers**: Type naam om snel te vinden
- **Paringen**: Filter op naam + "Enkel actieve partijen" checkbox

---

## 💾 Data Beheer

### Opslaan
- **Automatisch**: Elke wijziging wordt direct opgeslagen in localStorage
- **Geen save-knop nodig!**

### Export
1. **JSON Export**: Volledige backup van toernooi
   - Klik **"📤 Export JSON"**
   - Bestand wordt gedownload: `ToernooiNaam_id.json`
   - Gebruik dit voor backups of delen

2. **Klassement Export**: Printbare HTML
   - Klik **"📊 Export Klassement"**
   - HTML bestand met mooi opgemaakt klassement
   - Open in browser en print (Ctrl+P)

### Import
- Klik **"📥 Importeer JSON"** op het selectiescherm
- Selecteer eerder geëxporteerd `.json` bestand
- Toernooi wordt geïmporteerd met nieuw ID

---

## 🎲 Paring Algoritme - Hoe werkt het?

Het algoritme zoekt voor de **laagst geplaatste speler** een tegenstander die voldoet aan:

### Constraint X - Recente Tegenstander
❌ **Mag NIET** gespeeld hebben in de laatste X rondes (standaard: 3)
- Voorkomt dat dezelfde spelers constant tegen elkaar spelen
- Bij 0: geen restrictie

### Constraint Y - Puntenverschil
❌ **Maximaal** Y punten verschil (standaard: 3)
- Zorgt voor evenwichtige paringen
- Laagste speler krijgt geen tegenstander die veel hoger staat
- Bij 10: bijna geen restrictie

### Soft Constraint - Klas
⚠️ **Bij voorkeur** verschillende klassen (optioneel)
- Als ingeschakeld: vermijd zelfde klas
- Als geen andere optie: accepteer zelfde klas
- Handig voor scholen om variatie te creëren

### Kleur Toewijzing
De applicatie houdt bij hoeveel keer elke speler wit/zwart speelde:
- **Should be white/black**: 2+ keer verschil → krijgt sterk die kleur
- **Prefers white/black**: 1 keer verschil → krijgt bij voorkeur die kleur
- **Neutral**: Gelijk aantal → random toewijzing

---

## 🔧 Problemen Oplossen

### "Geen beschikbare spelers"
- Check of spelers niet afwezig zijn gemarkeerd
- Check of ze niet al in een actieve paring zitten
- Voer eerst resultaten in voor actieve paringen

### "Minimaal 2 beschikbare spelers nodig"
- Je hebt minstens 2 spelers nodig voor een paring
- Markeer spelers als aanwezig of voeg meer spelers toe

### Paringen voldoen niet aan verwachting
- Check de constraint instellingen (⚙️ Instellingen)
- Verhoog Constraint Y voor meer flexibiliteit
- Bij te strikte constraints vindt algoritme geen match

### Module errors in browser
- Gebruik een lokale server (niet direct file://)
- Run `start.ps1` of gebruik Live Server
- Check browser console (F12) voor specifieke errors

---

## 💡 Tips & Tricks

### Voor Jeugdtoernooien
- Gebruik **Run Through** mode
- Activeer **Klas constraint** om vrienden te spreiden
- Lage Constraint Y (2-3) voor eerlijke paringen
- Hoge Constraint X (4-5) voor variatie

### Voor Snelle Toernooien
- Hogere Constraint Y (5+) voor snellere paringen
- Lagere Constraint X (1-2) voor snellere herparingen
- Handmatige paringen voor laatste rondes

### Voor Schoolevenementen
- Import leerlingenlijst via CSV
- **Percentage** scoring voor eerlijke vergelijking
- Export klassement naar HTML voor op website
- Maak regelmatig JSON backup!

### Data Veiligheid
- localStorage kan gewist worden bij browser-cache clear
- Maak regelmatig JSON exports (wekelijks bij lang toernooi)
- Bewaar exports op veilige locatie (cloud, USB)

---

## 📱 Mobile Gebruik

De applicatie werkt volledig op tablets en smartphones:

- **Landscape mode**: 2-3 kolommen naast elkaar
- **Portrait mode**: Kolommen gestapeld, scroll tussen secties
- **Touch optimized**: Grote knoppen, swipe support
- **Responsive**: Past zich automatisch aan schermgrootte aan

---

## 🎉 Geniet van je toernooi!

PairFX is ontworpen om toernooien **soepel en plezierig** te laten verlopen.

**Vragen of suggesties?** Check de README.md voor meer details!

**Veel schaakplezier! ♟️**

