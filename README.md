# ASD1-M2-09 — Symulator wyborów do samorządu
Autor: Artiom Palevic · Informatyka, II rok · Filia UwB w Wilnie · ASD I · Mini-projekt M2 · 2026/2027

## Uruchomienie
- Aplikacja: otwórz `index.html` w przeglądarce (bez instalacji, działa lokalnie).
- Testy: `node tests.js` (Node.js ≥ 14, bez zależności) — 11 testów.

## Pliki
- `logic.js` — logika: własne wyszukiwanie liniowe (`findBy`), sortowanie przez wstawianie (`insertionSort`), walidacja, wynik, eksport/import JSON (wersja formatu 1).
- `index.html` — interfejs (teksty wstawiane jako tekst, nie HTML).
- `tests.js` — testy automatyczne.

## Reguły
Pierwszy poprawny głos przyjęty, kolejne odrzucone; błędna próba nie zużywa prawa głosu. % kandydata = głosy / poprawne głosy; frekwencja = poprawne głosy / uprawnieni. Remis: wszyscy liderzy (ID tylko do kolejności wyświetlania). Limit 1000 rekordów każdego rodzaju.

## Źródła i AI
Materiały z zajęć ASD I i M1. Kod przygotowany z pomocą Claude (Anthropic); kod przeczytany i zweryfikowany testami przez autora.
