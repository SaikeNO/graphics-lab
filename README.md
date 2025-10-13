# GraphicsLab - Laboratorium Grafiki Komputerowej

Aplikacja webowa do prostych operacji graficznych, stworzona przy użyciu React, TypeScript i Vite. Umożliwia rysowanie prymitywów oraz wczytywanie, wyświetlanie i zapisywanie obrazów w formacie PPM.

## Funkcjonalności

Aplikacja podzielona jest na dwa główne moduły (zadania):

### Zadanie 1: Prymitywy

Moduł ten umożliwia tworzenie i manipulowanie prostymi kształtami geometrycznymi na kanwie.

- **Rysowanie:** Możliwość rysowania linii, prostokątów i okręgów.
- **Narzędzia:** Dostępne narzędzia to rysowanie, zaznaczanie, przesuwanie i zmiana rozmiaru.
- **Personalizacja:** Użytkownik może wybrać kolor i grubość linii dla każdego kształtu.
- **Precyzja:** Kształty można dodawać i modyfikować zarówno poprzez interakcję z kanwą, jak i przez wprowadzanie dokładnych współrzędnych.
- **Zarządzanie:**
  - Zapisywanie stanu kanwy (wszystkich kształtów) do pliku JSON.
  - Wczytywanie kształtów z pliku JSON.
  - Całkowite czyszczenie kanwy.

### Zadanie 2: Format PPM

Moduł ten służy do pracy z obrazami w formacie PPM (Portable Pixmap).

- **Wczytywanie:** Obsługa wczytywania obrazów w formatach PPM (zarówno P3 - ASCII, jak i P6 - binarny) oraz JPEG.
- **Wyświetlanie:** Podgląd wczytanego obrazu na kanwie.
- **Informacje:** Wyświetlanie podstawowych informacji o obrazie (format, wymiary, maksymalna wartość koloru).
- **Zapisywanie:**
  - Eksport obrazu do formatu PPM (P6).
  - Eksport obrazu do formatu JPEG z możliwością regulacji jakości.

## Technologie

- **Framework:** [React](https://react.dev/)
- **Język:** [TypeScript](https://www.typescriptlang.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Stylowanie:** [Tailwind CSS](https://tailwindcss.com/)
- **Ikony:** [Lucide React](https://lucide.dev/guide/packages/lucide-react)

## Instalacja i uruchomienie

1.  Sklonuj repozytorium na swój komputer.
2.  Przejdź do głównego katalogu projektu.
3.  Zainstaluj zależności za pomocą menedżera pakietów:
    ```bash
    npm install
    ```
4.  Uruchom serwer deweloperski:
    ```bash
    npm run dev
    ```
5.  Aplikacja będzie dostępna pod adresem `http://localhost:5173`.

## Dostępne skrypty

- `npm run dev`: Uruchamia aplikację w trybie deweloperskim.
- `npm run build`: Kompiluje i buduje aplikację do wersji produkcyjnej.
- `npm run lint`: Uruchamia lintera w celu sprawdzenia jakości kodu.
- `npm run preview`: Uruchamia lokalny serwer do podglądu wersji produkcyjnej.
