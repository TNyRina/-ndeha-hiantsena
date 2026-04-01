import { db } from './index'; 
import { categories, units } from './schema';

export const seedDatabase = async () => {
    try {
        // 1. Initialisation des Unités 
        const defaultUnits = [
            { label_unit: 'kg' },
            { label_unit: 'kapoaka' }, 
            { label_unit: 'liter' },
            { label_unit: 'unit' },
            { label_unit: 'ar' },
            { label_unit: 'mo' },
            { label_unit: 'bag' },
            { label_unit: 'paquage' }
        ];

        await db.insert(units).values(defaultUnits).onConflictDoNothing();

        // 2. Initialisation des Catégories avec Rate 
        // Plus le rate est bas, plus la priorité est haute pour l'algorithme.
        const defaultCategories = [
            { label_category: 'rice', rate: 1 },          
            { label_category: 'PPN', rate: 2 },            
            { label_category: 'health', rate: 3 },          
            { label_category: 'hygiene', rate: 4 },        
            { label_category: 'education', rate: 5 },      
            { label_category: 'variable coasts', rate: 6 }, 
            { label_category: 'fixed fee', rate: 7 },     
            { label_category: 'accessory', rate: 8 },    
            { label_category: 'comfort', rate: 9 },        
            { label_category: 'luxery', rate: 10 }           
        ];

        await db.insert(categories).values(defaultCategories).onConflictDoNothing();
        
        console.log("Initialisation des données (Seed) réussie !");
    } catch (error) {
        console.error("Erreur lors du Seed :", error);
    }
};