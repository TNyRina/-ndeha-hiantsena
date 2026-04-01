import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';

// Ouverture de la base de données physique
const expoDb = SQLite.openDatabaseSync('database.db');

// Initialisation de l'instance Drizzle
export const db = drizzle(expoDb);