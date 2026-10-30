import { faker } from '@faker-js/faker';
import { pathToFileURL } from 'node:url';
import { openDb, userCount, type DB } from './db.js';

export const HOBBIES = [
  'Reading',
  'Hiking',
  'Cooking',
  'Photography',
  'Gaming',
  'Cycling',
  'Swimming',
  'Painting',
  'Gardening',
  'Yoga',
  'Running',
  'Chess',
  'Fishing',
  'Knitting',
  'Dancing',
  'Singing',
  'Guitar',
  'Piano',
  'Writing',
  'Traveling',
  'Camping',
  'Skiing',
  'Surfing',
  'Climbing',
  'Baking',
  'Woodworking',
  'Pottery',
  'Birdwatching',
  'Astronomy',
  'Calligraphy',
  'Origami',
  'Skateboarding',
  'Tennis',
  'Football',
  'Basketball',
  'Volleyball',
  'Board Games',
  'Meditation',
  'Podcasting',
  'Blogging',
];

export const NATIONALITIES = [
  'American',
  'British',
  'Canadian',
  'Australian',
  'German',
  'French',
  'Spanish',
  'Italian',
  'Dutch',
  'Swedish',
  'Norwegian',
  'Danish',
  'Finnish',
  'Irish',
  'Brazilian',
  'Mexican',
  'Argentinian',
  'Japanese',
  'Korean',
  'Chinese',
  'Indian',
  'Emirati',
  'Egyptian',
  'Nigerian',
  'South African',
];

export function seed(db: DB, count = 10_000, seedValue = 42): void {
  faker.seed(seedValue);

  // Skewed weights so the top-20 facets have a meaningful order.
  const weighted = <T>(items: T[]) =>
    items.map((value, i) => ({ value, weight: items.length - i + 5 }));
  const nationalityWeights = weighted(NATIONALITIES);
  const hobbyWeights = weighted(HOBBIES);

  const insertHobby = db.prepare('INSERT INTO hobbies (name) VALUES (?)');
  const insertUser = db.prepare(
    `INSERT INTO users (avatar, first_name, last_name, date_of_birth, nationality)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertUserHobby = db.prepare('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)');

  db.transaction(() => {
    db.exec('DELETE FROM user_hobbies; DELETE FROM users; DELETE FROM hobbies;');
    const hobbyIds = new Map<string, number>();
    for (const name of HOBBIES) {
      hobbyIds.set(name, Number(insertHobby.run(name).lastInsertRowid));
    }

    for (let i = 0; i < count; i++) {
      const sex = faker.person.sexType();
      const firstName = faker.person.firstName(sex);
      const lastName = faker.person.lastName();
      const userId = Number(
        insertUser.run(
          `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(`${firstName}-${lastName}-${i}`)}`,
          firstName,
          lastName,
          faker.date.birthdate({ mode: 'age', min: 18, max: 80 }).toISOString().slice(0, 10),
          faker.helpers.weightedArrayElement(nationalityWeights),
        ).lastInsertRowid,
      );

      const hobbyCount = faker.number.int({ min: 0, max: 10 });
      const picked = new Set<string>();
      while (picked.size < hobbyCount) {
        picked.add(faker.helpers.weightedArrayElement(hobbyWeights));
      }
      for (const hobby of picked) insertUserHobby.run(userId, hobbyIds.get(hobby)!);
    }
  })();
}

export function seedIfEmpty(db: DB): void {
  if (userCount(db) === 0) {
    console.log('Database is empty, seeding...');
    seed(db);
    console.log(`Seeded ${userCount(db)} users.`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = openDb();
  const count = Number(process.env.SEED_COUNT ?? 10_000);
  console.time('seed');
  seed(db, count);
  console.timeEnd('seed');
  console.log(`Seeded ${userCount(db)} users into ${db.name}`);
  db.close();
}
