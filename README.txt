KALENDARZ PRACY

Prywatna aplikacja (PWA) do śledzenia godzin pracy, urlopu i zwolnień
lekarskich — z automatycznym liczeniem godzin netto/nocnych/niedzielnych
oraz statusem Polska <-> Niemcy liczonym z konfigurowalnego cyklu zjazdów.
Każde konto widzi tylko swoje dane.

Aktualna wersja: v1.8 (pełna historia zmian: przycisk "Co nowego?" w
stopce aplikacji).


CO APKA UMIE

- Dzisiejsza zmiana — jednym kliknięciem dodaje dzisiejszy dzień na
  podstawie zapisanego szablonu godzin albo ręcznie wpisanych godzin.

- Kalendarz miesięczny — kolorowe komórki dla każdego dnia (własny
  kolor per szablon godzin), legenda pod spodem tłumacząca kolory
  faktycznie użyte w danym miesiącu.

- Urlop i zwolnienia lekarskie — zakres dni zaznaczany w kalendarzu,
  roczny limit urlopu, historia z podsumowaniem rocznym.

- Cykl Polska <-> Niemcy — status w nagłówku ("Jesteś w Polsce" /
  "Wracasz do Niemiec za X dni"), licznik do najbliższego zjazdu,
  możliwość dodania dodatkowego pobytu poza cyklem.

- Twoje szablony godzin (Konfiguracja) — własne, nazwane presety
  (np. "Nocka") z zapisanymi godzinami, przerwą i kolorem w kalendarzu;
  wykorzystywane w "Dzisiejsza zmiana", "Edytuj dzień" i "Dodaj cały
  tydzień".

- Eksporty — CSV / Excel / PDF miesięcznego zestawienia godzin oraz
  osobno harmonogramu zjazdów do Polski.

- Powiadomienia (toast) — potwierdzenie sukcesu/błędu po każdej akcji
  zapisu.

- Tryb jasny/ciemny, działa jako aplikacja na telefonie (PWA, można
  "zainstalować" na ekranie głównym).


JAK TO URUCHOMIĆ LOKALNIE (do testowania zmian)

Apka to zwykłe pliki HTML/CSS/JS — nie ma builda ani "npm install".
Wystarczy dowolny lokalny serwer plików statycznych, np. rozszerzenie
Live Server w VS Code, albo z terminala:

    npx http-server -p 8877 -c-1

i otworzyć http://localhost:8877/index.html


Z CZEGO JEST ZROBIONA

- Zwykły HTML/CSS/JavaScript (bez frameworka typu React) — cała
  logika w jednym pliku script.js.
- Baza danych i logowanie: Supabase (Postgres + autoryzacja) —
  każde konto widzi wyłącznie swoje dane.
- Działa jako PWA (Progressive Web App) — da się dodać do ekranu
  głównego telefonu, częściowo działa offline (przeglądanie ostatnio
  wczytanych danych; dodawanie/edycja wymaga internetu).


PLIKI W PROJEKCIE

  index.html      cała struktura strony i treści okienek
  script.js       cała logika aplikacji
  style.css       wygląd (jasny/ciemny motyw)
  config.js       dane połączenia z Supabase
  sw.js           Service Worker (obsługa PWA/offline)
  manifest.json   ustawienia PWA (ikona, nazwa przy instalacji)
  icons/, fonts/  ikony aplikacji i font użyty w eksportach PDF


STATUS

Prototyp w aktywnym rozwoju — funkcje i wygląd mogą się zmieniać.
Nie jest jeszcze publicznie udostępniona.
