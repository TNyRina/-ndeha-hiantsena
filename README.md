# 'Ndeha hiantsena' 🛒🇲🇬

**'ndeha hiantsena'**  est une application mobile de gestion budgétaire intelligente conçue pour optimiser les achats au marché dans le contexte économique malagasy. 

L'application utilise un algorithme de recherche **Branch and Bound** pour garantir que les besoins vitaux (Riz, PPN) sont satisfaits avant d'allouer le budget restant aux catégories secondaires.

## 🌟 Points Forts
- **Priorisation Culturelle :** Système de notation (`rate`) basé sur les habitudes de consommation locales (ex: Le riz est la priorité absolue).
- **Algorithme d'Optimisation :** Résolution du problème du sac à dos (Knapsack Problem) sous contraintes de priorités strictes.
- **Architecture Offline-First :** Utilisation de SQLite pour une réactivité totale même sans connexion internet au fond du marché.
- **Interface Moderne :** Design minimaliste et sombre avec des accents émeraude, optimisé pour la lecture rapide en extérieur.

## 🛠️ Stack Technique
- **Framework :** [React Native](https://reactnative.dev/) (Expo)
- **Langage :** TypeScript
- **Base de Données :** [SQLite](https://www.sqlite.org/) via `expo-sqlite`
- **ORM :** [Drizzle ORM](https://orm.drizzle.team/)
- **Gestion d'état :** React Context API

## 📈 Classification des Besoins (Algorithme)

L'application classe automatiquement les dépenses pour guider l'algorithme d'élagage :

| Catégorie | Rate | Description |
| :--- | :--- | :--- |
| **Vary (Riz)** | 1 | Base de l'alimentation (souvent > 50% du budget). |
| **PPN** | 2 | Produits de Première Nécessité (Huile, Charbon, Sel). |
| **Santé** | 3 | Soins urgents et pharmacie de base. |
| **Hygiène** | 4 | Savon, lessive, produits corporels. |
| **Éducation** | 5 | Fournitures scolaires essentielles. |
| **Consommables** | 6 | Carburant, Crédit appel/data, Taxi-be. |
| **Frais Fixes** | 7 | Loyer, Jirama (ajustables en cas de crise). |
| **Accessoires** | 8 | Vêtements, friperie, petits objets. |
| **Confort/Luxe**| 9-10| Loisirs, mobilier non-urgent, sorties. |

## 🏗️ Architecture des Données

Le schéma de base de données est optimisé pour les jointures rapides entre les prix du marché et la liste de courses :

- `categories` : Stocke les libellés et les coefficients de priorité.
- `products` : Catalogue des articles liés aux unités (Kg, Kapoaka, Litre).
- `market_prices` : Historique des prix relevés auprès des différents vendeurs.
- `shopping_list` : Le panier courant en attente d'optimisation.

## 🚀 Installation

1. **Cloner le dépôt**
   ```bash
   git clone [https://github.com/votre-username/aza-mirobaroba.git](https://github.com/votre-username/aza-mirobaroba.git)

2. **Installer les dépendances**
    ```bash
    npm install

3. **Configurer la base de données**
    ```bash
    npx drizzle-kit generate
    npx drizzle-kit export # Pour générer les migrations mobiles

3. **Lancer l'application**
    ```bash
    npx expo start


## 🧠 À propos de l'algorithme
L'algorithme de Branch and Bound explore les combinaisons de produits. Si le prix estimé (basé sur le prix le plus élevé du marché) dépasse le budget, il coupe (élague) les branches correspondant aux catégories de rate élevé (8 à 10) pour stabiliser le panier sur les besoins essentiels.

## Développé par RATOVOARISON Tsiory Ny Rina Étudiant 