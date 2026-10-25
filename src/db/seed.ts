import { db } from './db'

const DEFAULT_EQUIPMENT = ['מזרן', 'רפורמר', 'כדור', 'טבעת פילאטיס', 'גומייה', 'גליל', 'משקולות', 'כדור קטן']

/** First run only: adds the default equipment. */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.equipment, async () => {
    if ((await db.equipment.count()) > 0) return
    const now = Date.now()
    await db.equipment.bulkAdd(DEFAULT_EQUIPMENT.map((name) => ({ id: crypto.randomUUID(), name, updatedAt: now })))
  })
}
